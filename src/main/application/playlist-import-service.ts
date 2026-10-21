import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { asc, eq } from 'drizzle-orm'
import type { openDatabase } from '../database/database'
import { mediaLibrary, playlistImportItems, playlistImports } from '../database/schema'
import type { DownloadManager } from './download-manager'
import type { LocalPlaylistService } from './local-playlist-service'
import type { ProcessRunner } from '../domain/media-provider'
import type { Settings } from '../../shared/contracts/media'
import type { PlaylistImport, YouTubeCandidate } from '../../shared/contracts/playlist-import'
import { readSpotifyPublicPlaylist, readSpotifyPublicTrack, type SpotifySourceTrack } from '../infrastructure/spotify-public-playlist'
import { readSpotifyExport } from '../infrastructure/spotify-export'
import { automaticYouTubeMatch, searchYouTubeTrack } from '../infrastructure/media/youtube-track-search'
import type { YtDlpProvider } from '../infrastructure/media/yt-dlp-provider'

type Database = ReturnType<typeof openDatabase>['db']
type ImportRow = typeof playlistImports.$inferSelect
type ItemRow = typeof playlistImportItems.$inferSelect

export class PlaylistImportService {
  private readonly sourceTasks = new Set<string>()
  private readonly matchTasks = new Set<string>()
  private readonly queueTasks = new Set<string>()

  constructor(
    private readonly db: Database,
    private readonly manager: DownloadManager,
    private readonly localPlaylists: LocalPlaylistService,
    private readonly runner: ProcessRunner,
    private readonly ytDlp: string,
    private readonly youtube: YtDlpProvider,
    private readonly getSettings: () => Settings,
  ) {
    this.db.update(playlistImports).set({ matching: false, downloading: false }).run()
    this.db.update(playlistImportItems).set({ matchStatus: 'pending' })
      .where(eq(playlistImportItems.matchStatus, 'searching')).run()
    this.syncDownloads()
  }

  private rows(id: string): ItemRow[] {
    return this.db.select().from(playlistImportItems)
      .where(eq(playlistImportItems.importId, id))
      .orderBy(asc(playlistImportItems.position)).all()
  }

  private require(id: string): ImportRow {
    const row = this.db.select().from(playlistImports)
      .where(eq(playlistImports.id, id)).get()
    if (!row) throw new Error('Rascunho não encontrado.')
    return row
  }

  private complete(row: ImportRow, items: ItemRow[]): boolean {
    return row.expectedCount !== null && row.expectedCount === items.length &&
      items.every((item) => item.title && item.artist)
  }

  list(): PlaylistImport[] {
    this.syncDownloads()
    const downloadStatuses = new Map(this.manager.list().map((row) => [row.id, row.status]))
    return this.db.select().from(playlistImports).all()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((row) => {
        const items = this.rows(row.id)
        return {
          id: row.id, name: row.name, sourceUrl: row.sourceUrl,
          origin: row.origin as PlaylistImport['origin'],
          expectedCount: row.expectedCount, complete: this.complete(row, items),
          matching: row.matching, downloading: row.downloading,
          localPlaylistId: row.localPlaylistId,
          createdAt: row.createdAt, updatedAt: row.updatedAt,
          items: items.map((item) => ({
            id: item.id, position: item.position, spotifyId: item.spotifyId,
            title: item.title, artist: item.artist, durationMs: item.durationMs,
            matchStatus: item.matchStatus as PlaylistImport['items'][number]['matchStatus'],
            candidates: JSON.parse(item.candidatesJson) as YouTubeCandidate[],
            youtubeUrl: item.youtubeUrl, downloadId: item.downloadId,
            downloadStatus: item.downloadId ? downloadStatuses.get(item.downloadId) ?? null : null,
            errorMessage: item.errorMessage,
          })),
        }
      })
  }

  async createFromLink(url: string): Promise<PlaylistImport> {
    const source = await readSpotifyPublicPlaylist(url)
    const id = randomUUID()
    const now = Date.now()
    this.db.transaction((tx) => {
      tx.insert(playlistImports).values({
        id, name: source.name, sourceUrl: source.url, origin: 'public',
        expectedCount: source.expectedCount, matching: false, downloading: false,
        createdAt: now, updatedAt: now,
      }).run()
      source.tracks.forEach((track, position) => {
        tx.insert(playlistImportItems).values({
          id: randomUUID(), importId: id, position,
          spotifyId: track.spotifyId, title: track.title,
          artist: track.artist, durationMs: track.durationMs,
        }).run()
      })
    })
    this.startSourceHydration(id)
    return this.list().find((item) => item.id === id)!
  }

  retrySource(id: string): void {
    const row = this.require(id)
    if (row.origin !== 'public') return
    this.startSourceHydration(id)
  }

  private startSourceHydration(id: string): void {
    if (this.sourceTasks.has(id)) return
    this.sourceTasks.add(id)
    void this.hydrateSource(id).catch(() => undefined)
      .finally(() => this.sourceTasks.delete(id))
  }

  private async hydrateSource(id: string): Promise<void> {
    const row = this.require(id)
    const current = this.rows(id)
    if (row.expectedCount === null || current.length < row.expectedCount) {
      try {
        const refreshed = await readSpotifyPublicPlaylist(row.sourceUrl)
        if (this.require(id).origin !== 'public') return
        if (refreshed.tracks.length > current.length) {
          this.db.transaction((tx) => {
            tx.delete(playlistImportItems).where(eq(playlistImportItems.importId, id)).run()
            refreshed.tracks.forEach((track, position) => tx.insert(playlistImportItems).values({
              id: randomUUID(), importId: id, position,
              spotifyId: track.spotifyId, title: track.title,
              artist: track.artist, durationMs: track.durationMs,
            }).run())
            tx.update(playlistImports).set({
              expectedCount: refreshed.expectedCount, updatedAt: Date.now(),
            }).where(eq(playlistImports.id, id)).run()
          })
        }
      } catch {
        // Keep the partial draft; the official export can complete it.
      }
    }
    const pending = this.rows(id).filter((item) => !item.title || !item.artist)
    const byId = new Map<string, SpotifySourceTrack>()
    for (const item of pending) {
      if (this.require(id).origin !== 'public') return
      if (!item.spotifyId) continue
      try {
        let track = byId.get(item.spotifyId)
        if (!track) {
          track = await readSpotifyPublicTrack(item.spotifyId)
          byId.set(item.spotifyId, track)
        }
        if (this.require(id).origin !== 'public') return
        this.db.update(playlistImportItems).set({
          title: track.title, artist: track.artist, durationMs: track.durationMs,
          errorMessage: null,
        }).where(eq(playlistImportItems.id, item.id)).run()
      } catch {
        this.db.update(playlistImportItems).set({
          errorMessage: 'Não foi possível ler esta faixa. Tente novamente ou importe a exportação.',
        }).where(eq(playlistImportItems.id, item.id)).run()
      }
    }
    this.db.update(playlistImports).set({ updatedAt: Date.now() })
      .where(eq(playlistImports.id, id)).run()
  }

  async importExport(id: string, path: string): Promise<void> {
    const row = this.require(id)
    if (this.rows(id).some((item) => item.downloadId))
      throw new Error('Este rascunho já começou a baixar músicas.')
    const options = await readSpotifyExport(path)
    const existing = new Set(this.rows(id).map((item) => item.spotifyId).filter(Boolean))
    const choice = options.filter((option) => option.name.toLowerCase() === row.name.toLowerCase())
      .sort((a, b) =>
        b.tracks.filter((track) => existing.has(track.spotifyId)).length -
        a.tracks.filter((track) => existing.has(track.spotifyId)).length,
      )[0]
    if (!choice) throw new Error(`Não encontrei a playlist “${row.name}” nesta exportação.`)
    if (choice.tracks.length !== choice.itemCount)
      throw new Error('A exportação contém episódios ou itens sem dados de música; não é possível confirmar a lista completa.')
    if (row.expectedCount !== null && choice.itemCount !== row.expectedCount)
      throw new Error(`A exportação contém ${choice.itemCount} itens, mas o Spotify anunciou ${row.expectedCount}. Confira se é a mesma versão da playlist.`)
    const knownPositions = this.rows(id).filter((item) => item.spotifyId)
    if (knownPositions.some((item) => choice.tracks[item.position]?.spotifyId !== item.spotifyId))
      throw new Error('A ordem da exportação não corresponde à playlist pública. Confira se é a mesma versão da playlist.')
    this.db.transaction((tx) => {
      tx.delete(playlistImportItems).where(eq(playlistImportItems.importId, id)).run()
      choice.tracks.forEach((track, position) => tx.insert(playlistImportItems).values({
        id: randomUUID(), importId: id, position, spotifyId: track.spotifyId,
        title: track.title, artist: track.artist, durationMs: track.durationMs,
      }).run())
      tx.update(playlistImports).set({
        origin: 'export', expectedCount: choice.itemCount, updatedAt: Date.now(),
      }).where(eq(playlistImports.id, id)).run()
    })
  }

  startMatching(id: string): void {
    const row = this.require(id)
    if (!this.complete(row, this.rows(id)))
      throw new Error('Complete a lista do Spotify antes de buscar no YouTube.')
    if (this.matchTasks.has(id)) return
    this.matchTasks.add(id)
    this.db.update(playlistImports).set({ matching: true })
      .where(eq(playlistImports.id, id)).run()
    void this.runMatching(id).catch(() => undefined).finally(() => {
      this.matchTasks.delete(id)
      this.db.update(playlistImports).set({ matching: false, updatedAt: Date.now() })
        .where(eq(playlistImports.id, id)).run()
    })
  }

  private async runMatching(id: string): Promise<void> {
    for (const item of this.rows(id)) {
      if (!['pending', 'error'].includes(item.matchStatus) || !item.title || !item.artist) continue
      this.db.update(playlistImportItems).set({ matchStatus: 'searching', errorMessage: null })
        .where(eq(playlistImportItems.id, item.id)).run()
      try {
        const settings = this.getSettings()
        const candidates = await searchYouTubeTrack(this.runner, this.ytDlp, {
          title: item.title, artist: item.artist, durationMs: item.durationMs,
        }, {
          file: settings.youtubeCookiesFile && existsSync(settings.youtubeCookiesFile)
            ? settings.youtubeCookiesFile : '',
          browser: settings.youtubeBrowser,
        })
        const selected = automaticYouTubeMatch(candidates)
        this.db.update(playlistImportItems).set({
          matchStatus: selected ? 'matched' : 'review',
          youtubeUrl: selected?.url ?? null,
          candidatesJson: JSON.stringify(candidates),
        }).where(eq(playlistImportItems.id, item.id)).run()
      } catch (error) {
        this.db.update(playlistImportItems).set({
          matchStatus: 'error',
          errorMessage: error instanceof Error ? error.message.slice(0, 300) : 'Busca indisponível.',
        }).where(eq(playlistImportItems.id, item.id)).run()
      }
    }
  }

  async searchItem(itemId: string, query: string): Promise<YouTubeCandidate[]> {
    const item = this.db.select().from(playlistImportItems)
      .where(eq(playlistImportItems.id, itemId)).get()
    if (!item?.title || !item.artist) throw new Error('Faixa não encontrada.')
    const settings = this.getSettings()
    const candidates = await searchYouTubeTrack(this.runner, this.ytDlp, {
      title: item.title, artist: item.artist, durationMs: item.durationMs,
    }, {
      file: settings.youtubeCookiesFile && existsSync(settings.youtubeCookiesFile)
        ? settings.youtubeCookiesFile : '',
      browser: settings.youtubeBrowser,
    }, query)
    this.db.update(playlistImportItems).set({
      matchStatus: 'review', candidatesJson: JSON.stringify(candidates), errorMessage: null,
    }).where(eq(playlistImportItems.id, itemId)).run()
    return candidates
  }

  chooseMatch(itemId: string, youtubeUrl: string | null): void {
    const item = this.db.select().from(playlistImportItems)
      .where(eq(playlistImportItems.id, itemId)).get()
    if (!item || item.downloadId) throw new Error('Esta música não pode mais ser alterada.')
    if (youtubeUrl) {
      const url = new URL(youtubeUrl)
      const id = url.hostname === 'youtu.be' ? url.pathname.slice(1)
        : ['youtube.com', 'www.youtube.com', 'music.youtube.com'].includes(url.hostname)
          ? url.searchParams.get('v') : null
      if (url.protocol !== 'https:' || !id || !/^[A-Za-z0-9_-]{11}$/.test(id))
        throw new Error('Cole um link de vídeo válido do YouTube.')
      youtubeUrl = `https://www.youtube.com/watch?v=${id}`
    }
    this.db.update(playlistImportItems).set({
      matchStatus: youtubeUrl ? 'matched' : 'skipped',
      youtubeUrl, errorMessage: null,
    }).where(eq(playlistImportItems.id, itemId)).run()
  }

  startDownloads(id: string): void {
    const row = this.require(id)
    const items = this.rows(id)
    if (!this.complete(row, items)) throw new Error('A playlist ainda está incompleta.')
    if (row.matching || items.some((item) => !['matched', 'skipped'].includes(item.matchStatus)))
      throw new Error('Revise as músicas sem correspondência antes de baixar.')
    if (this.queueTasks.has(id)) return
    if (!row.localPlaylistId) {
      const created = this.localPlaylists.create(row.name, 'Importada de uma playlist pública do Spotify.')
      this.db.update(playlistImports).set({ localPlaylistId: created.id })
        .where(eq(playlistImports.id, id)).run()
    }
    this.queueTasks.add(id)
    this.db.update(playlistImports).set({ downloading: true })
      .where(eq(playlistImports.id, id)).run()
    void this.queueDownloads(id).catch(() => undefined).finally(() => {
      this.queueTasks.delete(id)
      this.db.update(playlistImports).set({ downloading: false, updatedAt: Date.now() })
        .where(eq(playlistImports.id, id)).run()
    })
  }

  private async queueDownloads(id: string): Promise<void> {
    this.syncDownloads()
    const priorByUrl = new Map<string, string>()
    for (const item of this.rows(id)) {
      if (item.youtubeUrl && item.downloadId) priorByUrl.set(item.youtubeUrl, item.downloadId)
    }
    for (const item of this.rows(id)) {
      if (item.matchStatus !== 'matched' || !item.youtubeUrl) continue
      const prior = item.downloadId && this.manager.list().find((entry) => entry.id === item.downloadId)
      if (prior && ['queued', 'downloading', 'processing', 'completed'].includes(prior.status)) continue
      const duplicate = priorByUrl.get(item.youtubeUrl)
      if (duplicate && duplicate !== item.downloadId) {
        this.db.update(playlistImportItems).set({ downloadId: duplicate })
          .where(eq(playlistImportItems.id, item.id)).run()
        continue
      }
      try {
        const analysis = await this.youtube.analyze(new URL(item.youtubeUrl))
        const wanted = this.getSettings().preferredDownload.audioExtension
        const format = analysis.formats.find((entry) => entry.mediaType === 'audio' && entry.extension === wanted)
          ?? analysis.formats.find((entry) => entry.mediaType === 'audio')
        if (!format) throw new Error('Este vídeo não oferece um formato de áudio disponível.')
        const download = await this.manager.start({
          url: item.youtubeUrl, provider: 'youtube', mediaType: 'audio',
          title: item.title ?? analysis.title, formatId: format.id,
          extension: format.extension, hasAudio: true, quality: format.quality,
          thumbnail: analysis.thumbnail, artist: item.artist,
          channel: analysis.channel, durationMs: analysis.durationMs,
        })
        priorByUrl.set(item.youtubeUrl, download.id)
        this.db.update(playlistImportItems).set({ downloadId: download.id, errorMessage: null })
          .where(eq(playlistImportItems.id, item.id)).run()
      } catch (error) {
        this.db.update(playlistImportItems).set({
          errorMessage: error instanceof Error ? error.message.slice(0, 300) : 'Não foi possível adicionar à fila.',
        }).where(eq(playlistImportItems.id, item.id)).run()
      }
    }
    this.syncDownloads()
  }

  syncDownloads(): void {
    const waiting = this.db.select().from(playlistImportItems)
      .where(eq(playlistImportItems.linked, false)).all()
      .filter((item) => item.downloadId)
    const byDownload = new Map(this.manager.list().map((item) => [item.id, item]))
    for (const item of waiting) {
      const download = item.downloadId ? byDownload.get(item.downloadId) : null
      if (!download || download.status !== 'completed') continue
      const media = this.db.select().from(mediaLibrary)
        .where(eq(mediaLibrary.downloadId, download.id)).get()
      if (!media) continue
      const parent = this.require(item.importId)
      if (!parent.localPlaylistId) continue
      if (item.title && (media.title !== item.title || media.artist !== item.artist)) {
        this.db.update(mediaLibrary).set({ title: item.title, artist: item.artist })
          .where(eq(mediaLibrary.id, media.id)).run()
      }
      this.localPlaylists.addAt(parent.localPlaylistId, media.id, item.position * 1000)
      this.db.update(playlistImportItems).set({ linked: true })
        .where(eq(playlistImportItems.id, item.id)).run()
    }
  }

  delete(id: string): void {
    this.require(id)
    if (this.sourceTasks.has(id) || this.matchTasks.has(id) || this.queueTasks.has(id))
      throw new Error('Aguarde a operação terminar antes de excluir o rascunho.')
    this.db.delete(playlistImports).where(eq(playlistImports.id, id)).run()
  }
}
