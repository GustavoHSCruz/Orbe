import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProcessRunner } from '../../domain/media-provider'

export class PreviewService {
  private readonly files = new Map<string, { id: string; path: string }>()
  private readonly pending = new Map<string, Promise<string>>()
  private initialization: Promise<void> | null = null
  private readonly abort = new AbortController()

  constructor(
    private readonly directory: string,
    private readonly ytDlp: string,
    private readonly ffmpeg: string,
    private readonly runner: ProcessRunner,
  ) {}

  private initialize(): Promise<void> {
    this.initialization ??= (async () => {
      await rm(this.directory, { recursive: true, force: true })
      await mkdir(this.directory, { recursive: true })
    })()
    return this.initialization
  }

  async create(
    url: string,
    auth: { cookiesFile?: string; browser?: string } = {},
  ): Promise<string> {
    const cacheKey = JSON.stringify([url, auth.cookiesFile, auth.browser])
    const cached = this.files.get(cacheKey)
    if (cached && existsSync(cached.path))
      return `orbe-media://preview/${cached.id}`
    const active = this.pending.get(cacheKey)
    if (active) return active

    const task = (async () => {
      await this.initialize()
      const id = randomUUID()
      const path = join(this.directory, `${id}.mp3`)
      await this.runner.run(
        this.ytDlp,
        [
          '--encoding',
          'utf-8',
          '--no-warnings',
          '--no-playlist',
          '--download-sections',
          '*0-30',
          '--ffmpeg-location',
          this.ffmpeg,
          '-f',
          'bestaudio/best',
          '-x',
          '--audio-format',
          'mp3',
          '--audio-quality',
          '5',
          ...(auth.cookiesFile
            ? ['--cookies', auth.cookiesFile]
            : auth.browser && auth.browser !== 'none'
              ? ['--cookies-from-browser', auth.browser]
              : []),
          '-o',
          join(this.directory, `${id}.%(ext)s`),
          url,
        ],
        { timeoutMs: 120000, signal: this.abort.signal },
      )
      if (!existsSync(path))
        throw new Error('A prévia não ficou disponível. Tente outra mídia.')
      this.files.set(cacheKey, { id, path })
      return `orbe-media://preview/${id}`
    })()
    this.pending.set(cacheKey, task)
    try {
      return await task
    } finally {
      this.pending.delete(cacheKey)
    }
  }

  find(id: string): string | null {
    for (const file of this.files.values())
      if (file.id === id && existsSync(file.path)) return file.path
    return null
  }

  async dispose(): Promise<void> {
    this.abort.abort()
    await Promise.allSettled(this.pending.values())
    await rm(this.directory, { recursive: true, force: true })
  }
}
