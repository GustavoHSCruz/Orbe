import { readdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type {
  LibraryLocations,
  PreviousDirectoryAction,
} from '../../shared/contracts/library-locations'
import type { Settings } from '../../shared/contracts/media'
import { isMediaFile, type LibraryService } from './library-service'
import type { SettingsService } from './settings-service'

export function sameDirectory(left: string, right: string): boolean {
  const normalize = (path: string) =>
    process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
  return normalize(left) === normalize(right)
}
export function relativeMediaPath(
  directory: string,
  filePath: string,
): string | null {
  const path = relative(resolve(directory), resolve(filePath))
  return path &&
    path !== '..' &&
    !path.startsWith(`..${sep}`) &&
    !isAbsolute(path)
    ? path
    : null
}

async function fileState(
  path: string,
): Promise<'ready' | 'missing' | 'unreadable'> {
  try {
    return (await stat(path)).isFile() ? 'ready' : 'missing'
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ||
      (error as NodeJS.ErrnoException).code === 'ENOTDIR'
      ? 'missing'
      : 'unreadable'
  }
}

export class LibraryLocationsService {
  private current: LibraryLocations = {
    directories: [],
    missing: [],
    scanning: false,
    lastScanAt: null,
    imported: 0,
    relinked: 0,
    errors: [],
  }
  private work: Promise<LibraryLocations> | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private disposed = false

  constructor(
    private readonly library: LibraryService,
    private readonly settings: SettingsService,
    private readonly isWritingMedia: () => boolean = () => false,
  ) {}

  private directories(): string[] {
    const value = this.settings.get()
    return [value.downloadDirectory, ...value.libraryDirectories].filter(
      (path, index, paths) =>
        paths.findIndex((other) => sameDirectory(path, other)) === index,
    )
  }

  snapshot(): LibraryLocations {
    return structuredClone(this.current)
  }

  start(): void {
    void this.scan()
    this.timer = setInterval(() => {
      void this.scan()
    }, 45000)
    this.timer.unref()
  }

  async dispose(): Promise<void> {
    this.disposed = true
    if (this.timer) clearInterval(this.timer)
    await this.work
  }

  async saveSettings(
    value: Settings,
    action?: PreviousDirectoryAction,
  ): Promise<Settings> {
    const previous = this.settings.get()
    let directories = value.libraryDirectories
    if (!sameDirectory(previous.downloadDirectory, value.downloadDirectory)) {
      if (
        !action &&
        this.library
          .list()
          .some((item) =>
            relativeMediaPath(previous.downloadDirectory, item.filePath),
          )
      )
        throw new Error(
          'Escolha se deseja manter a pasta anterior nas pastas de mídia antes de salvar.',
        )
      if (action === 'keep')
        directories = [...directories, previous.downloadDirectory]
      if (action === 'stop')
        directories = directories.filter(
          (path) => !sameDirectory(path, previous.downloadDirectory),
        )
    }
    const saved = this.settings.save({
      ...value,
      libraryDirectories: directories.filter(
        (path, index, paths) =>
          !sameDirectory(path, value.downloadDirectory) &&
          paths.findIndex((other) => sameDirectory(path, other)) === index,
      ),
    })
    // A settings change may arrive while a scheduled scan is running. Scan the new roots afterward.
    if (this.work) await this.work
    await this.scan()
    return saved
  }

  async add(directory: string): Promise<LibraryLocations> {
    const value = this.settings.get()
    if (!this.directories().some((path) => sameDirectory(path, directory)))
      this.settings.save({
        ...value,
        libraryDirectories: [...value.libraryDirectories, resolve(directory)],
      })
    if (this.work) await this.work
    return this.scan()
  }

  async remove(directory: string): Promise<LibraryLocations> {
    const value = this.settings.get()
    if (sameDirectory(directory, value.downloadDirectory))
      throw new Error(
        'Esta é a pasta de downloads atual. Altere o destino antes de removê-la da busca.',
      )
    this.settings.save({
      ...value,
      libraryDirectories: value.libraryDirectories.filter(
        (path) => !sameDirectory(path, directory),
      ),
    })
    if (this.work) await this.work
    return this.scan()
  }

  async locateFile(id: string, path: string): Promise<LibraryLocations> {
    if (this.work) await this.work
    const item = this.library.find(id)
    if (!item) throw new Error('Item da biblioteca não encontrado.')
    if ((await fileState(item.filePath)) === 'ready')
      throw new Error(
        'O arquivo original voltou a ficar disponível. Atualize a biblioteca.',
      )
    if (!isMediaFile(path) || (await fileState(path)) !== 'ready')
      throw new Error('Escolha um arquivo de áudio ou vídeo acessível.')
    this.library.relink(id, path)
    return this.scan(1)
  }

  async relocate(
    previousPath: string,
    nextPath: string,
  ): Promise<LibraryLocations> {
    if (this.work) await this.work
    const known =
      this.directories().some((path) => sameDirectory(path, previousPath)) ||
      this.current.missing.some(({ directory }) =>
        sameDirectory(directory, previousPath),
      )
    if (!known)
      throw new Error(
        'Esta pasta não está registrada na biblioteca. Atualize e tente novamente.',
      )
    let relinked = 0
    for (const item of this.library.list()) {
      const suffix = relativeMediaPath(previousPath, item.filePath)
      if (!suffix || (await fileState(item.filePath)) !== 'missing') continue
      const candidate = resolve(nextPath, suffix)
      if (
        !relativeMediaPath(nextPath, candidate) ||
        (await fileState(candidate)) !== 'ready'
      )
        continue
      // Relative path + explicit user-selected replacement. Never guess by basename.
      this.library.relink(item.id, candidate)
      relinked++
    }
    const value = this.settings.get()
    this.settings.save({
      ...value,
      libraryDirectories: [
        ...value.libraryDirectories.filter(
          (path) => !sameDirectory(path, previousPath),
        ),
        resolve(nextPath),
      ],
    })
    return this.scan(relinked)
  }

  scan(relinked = 0): Promise<LibraryLocations> {
    if (this.work) return this.work
    if (this.disposed) return Promise.resolve(this.snapshot())
    this.current.scanning = true
    this.work = this.runScan(relinked)
      .catch((error) => {
        this.current = {
          ...this.current,
          errors: [
            error instanceof Error
              ? error.message
              : 'Não foi possível verificar as pastas.',
          ],
        }
        return this.snapshot()
      })
      .finally(() => {
        this.current.scanning = false
        this.work = null
      })
    return this.work.then(() => this.snapshot())
  }

  private async runScan(relinked: number): Promise<LibraryLocations> {
    const directories: LibraryLocations['directories'] = []
    const errors: string[] = []
    const discovered: string[] = []
    const visited = new Set<string>()
    const walk = async (directory: string): Promise<void> => {
      const key =
        process.platform === 'win32'
          ? resolve(directory).toLowerCase()
          : resolve(directory)
      if (visited.has(key) || this.disposed) return
      visited.add(key)
      let entries
      try {
        entries = await readdir(directory, { withFileTypes: true })
      } catch {
        errors.push(
          `Não foi possível ler a pasta ${directory}. Verifique a conexão e as permissões.`,
        )
        return
      }
      for (const entry of entries) {
        if (this.disposed) return
        const path = resolve(directory, entry.name)
        // Do not follow symbolic links/junctions outside user-selected roots.
        if (entry.name.startsWith('.')) continue
        if (entry.isDirectory() && !entry.isSymbolicLink()) await walk(path)
        else if (
          entry.isFile() &&
          isMediaFile(path) &&
          !/\.part\./i.test(entry.name)
        )
          discovered.push(path)
      }
    }
    const value = this.settings.get()
    for (const path of this.directories()) {
      let state: 'ready' | 'missing' | 'unreadable' = 'ready'
      try {
        if (!(await stat(path)).isDirectory()) state = 'missing'
      } catch (error) {
        state = ['ENOENT', 'ENOTDIR'].includes(
          (error as NodeJS.ErrnoException).code ?? '',
        )
          ? 'missing'
          : 'unreadable'
      }
      const before = errors.length
      if (state === 'ready') await walk(path)
      if (errors.length > before) state = 'unreadable'
      directories.push({
        path,
        isDownloadDirectory: sameDirectory(path, value.downloadDirectory),
        state,
      })
    }
    if (this.disposed) return this.snapshot()
    const existingPaths = new Set(
      this.library
        .list()
        .map((item) =>
          process.platform === 'win32'
            ? resolve(item.filePath).toLowerCase()
            : resolve(item.filePath),
        ),
    )
    const fresh = this.isWritingMedia()
      ? []
      : discovered.filter(
          (path) =>
            !existingPaths.has(
              process.platform === 'win32' ? path.toLowerCase() : path,
            ),
        )
    // Bounded batches avoid an unbounded list of IPC updates and retain downloaded metadata.
    for (let index = 0; index < fresh.length; index += 200)
      this.library.importFiles(fresh.slice(index, index + 200))
    const missing: LibraryLocations['missing'] = []
    for (const item of this.library.list()) {
      const state = await fileState(item.filePath)
      if (state === 'ready') continue
      const download = this.library.downloadFor(item.id)
      missing.push({
        item,
        directory: dirname(item.filePath),
        reason: state,
        downloadId: download?.id ?? null,
        downloadStatus:
          (download?.status as LibraryLocations['missing'][number]['downloadStatus']) ??
          null,
        canDownloadAgain:
          state === 'missing' &&
          !!download?.formatId &&
          ['completed', 'failed', 'cancelled'].includes(download.status),
      })
    }
    this.current = {
      directories,
      missing,
      lastScanAt: Date.now(),
      scanning: false,
      imported: fresh.length,
      relinked,
      errors,
    }
    return this.snapshot()
  }
}
