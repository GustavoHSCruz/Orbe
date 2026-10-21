import {
  app,
  dialog,
  ipcMain,
  Notification,
  protocol,
  shell,
  type BrowserWindow,
  type IpcMainInvokeEvent,
} from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { z } from 'zod'
import { HealthResponseSchema } from '../../shared/contracts/health'
import {
  AnalyzeRequestSchema,
  DownloadActionRequestSchema,
  DownloadListResponseSchema,
  DownloadRecordSchema,
  DownloadStartRequestSchema,
  LibraryListResponseSchema,
  MediaAnalysisSchema,
  OptionalNowPlayingTrackSchema,
  SettingsSchema,
} from '../../shared/contracts/media'
import { openDatabase } from '../database/database'
import { DownloadManager } from '../application/download-manager'
import { SettingsService } from '../application/settings-service'
import { LibraryService } from '../application/library-service'
import { LibraryLocationsService } from '../application/library-locations-service'
import {
  LibraryLocationsSchema,
  SaveSettingsRequestSchema,
} from '../../shared/contracts/library-locations'
import { NowPlayingService } from '../application/now-playing-service'
import { DiscordPresenceProvider } from '../infrastructure/discord-presence'
import { SpotifyService } from '../infrastructure/spotify-service'
import { GoogleService } from '../infrastructure/google-service'
import {
  SpotifyOverviewSchema,
  SpotifyPlaylistItemsSchema,
} from '../../shared/contracts/spotify'
import {
  YouTubeItemSchema,
  YouTubeOverviewSchema,
} from '../../shared/contracts/youtube'
import { processRunner } from '../infrastructure/media/process-runner'
import { mediaFileResponse } from '../infrastructure/media/media-file-response'
import { PreviewService } from '../infrastructure/media/preview-service'
import { MediaProviderRegistry } from '../infrastructure/media/provider-registry'
import { YtDlpProvider } from '../infrastructure/media/yt-dlp-provider'
import { AppError, userFacingMediaError } from '../domain/app-error'
import { logEvent } from '../infrastructure/logger'
import { mediaToolPath } from '../infrastructure/media-tools'
import { resolveDatabasePath } from '../infrastructure/brand-compatibility'
import {
  LyricsRequestSchema,
  LyricsCandidatesSchema,
  LyricsResultSchema,
  LyricsSearchSchema,
} from '../../shared/contracts/lyrics'
import {
  lyricsForTrack,
  searchLyrics,
  searchLyricsCandidates,
} from '../infrastructure/lyrics-service'
import { AudioLoudnessService } from '../infrastructure/audio-loudness-service'
import { ArtworkService } from '../infrastructure/artwork-service'
import { LocalPlaylistService } from '../application/local-playlist-service'
import { PlaylistImportService } from '../application/playlist-import-service'
import {
  PlaylistImportIdSchema,
  PlaylistImportLinkSchema,
  PlaylistImportsSchema,
  PlaylistMatchChoiceSchema,
  PlaylistMatchSearchSchema,
  YouTubeCandidateSchema,
} from '../../shared/contracts/playlist-import'
import { ConversionService } from '../infrastructure/media/conversion-service'
import {
  ConversionRequestSchema,
  ConversionResultSchema,
  OptionalConversionSourceSchema,
} from '../../shared/contracts/converter'
import {
  LocalPlaylistInputSchema,
  LocalPlaylistItemInputSchema,
  LocalPlaylistEntryInputSchema,
  LocalPlaylistSchema,
  LocalPlaylistsSchema,
} from '../../shared/contracts/local-playlists'

export function registerHandlers(
  getWindow: () => BrowserWindow | null,
): DownloadManager {
  const connection = openDatabase(
    resolveDatabasePath(app.getPath('userData')),
    join(app.getAppPath(), 'drizzle'),
  )
  ipcMain.handle('app:fullscreen', (event, input: unknown) => {
    validSender(event)
    const enabled = z.boolean().parse(input)
    const window = getWindow()
    if (!window) return false
    window.setFullScreen(enabled)
    return enabled
  })
  const settings = new SettingsService(
    connection.db,
    process.env.ORBE_DOWNLOAD_DIRECTORY ||
      join(app.getPath('downloads'), 'Orbe'),
  )
  const library = new LibraryService(connection.db)
  const localPlaylists = new LocalPlaylistService(connection.db, library)
  const discord = new DiscordPresenceProvider(
    settings.get().discordClientId || process.env.ORBE_DISCORD_CLIENT_ID || '',
  )
  const nowPlaying = new NowPlayingService(
    discord,
    () => settings.get().discord,
  )
  const spotify = new SpotifyService(
    () =>
      settings.get().spotifyClientId ||
      process.env.ORBE_SPOTIFY_CLIENT_ID ||
      '',
    app.getPath('userData'),
    (track) => nowPlaying.update(track, 'spotify'),
    () => !getWindow()?.isFocused(),
  )
  const google = new GoogleService(
    () =>
      settings.get().googleClientId || process.env.ORBE_GOOGLE_CLIENT_ID || '',
    app.getPath('userData'),
  )
  let preview: PreviewService | null = null
  protocol.handle('orbe-media', (request) => {
    const target = new URL(request.url)
    const id = target.pathname.slice(1)
    if (!z.uuid().safeParse(id).success)
      return new Response('Not found', { status: 404 })
    if (target.hostname === 'preview') {
      const filePath = preview?.find(id)
      return filePath
        ? mediaFileResponse(filePath, 'audio', request.headers.get('range'))
        : new Response('Not found', { status: 404 })
    }
    if (target.hostname !== 'library')
      return new Response('Not found', { status: 404 })
    const media = library.find(id)
    if (!media || !existsSync(media.filePath))
      return new Response('Not found', { status: 404 })
    return mediaFileResponse(
      media.filePath,
      media.mediaType,
      request.headers.get('range'),
    )
  })
  const toolOptions = {
    platform: process.platform,
    packaged: app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
  }
  const ytDlp = mediaToolPath('yt-dlp', toolOptions)
  const ffmpeg = mediaToolPath('ffmpeg', toolOptions)
  preview = new PreviewService(
    join(app.getPath('userData'), 'preview-cache'),
    ytDlp,
    ffmpeg,
    processRunner,
  )
  const artwork = new ArtworkService(library, ffmpeg)
  ipcMain.handle('artwork:for-track', async (event, input: unknown) => {
    validSender(event)
    return artwork.forTrack(DownloadActionRequestSchema.parse(input).id)
  })
  const ffprobe = mediaToolPath('ffprobe', toolOptions)
  const loudness = new AudioLoudnessService(connection.db, library, ffmpeg)
  const converter = new ConversionService(ffmpeg, ffprobe, processRunner)
  let conversionSource: {
    path: string
    info: NonNullable<z.infer<typeof OptionalConversionSourceSchema>>
  } | null = null
  let conversionController: AbortController | null = null
  let convertedPath: string | null = null
  const youtubeProvider = new YtDlpProvider(
    'youtube',
    'YouTube',
    processRunner,
    ytDlp,
    ffmpeg,
    () => settings.get().youtubeCookiesFile,
    () => settings.get().youtubeBrowser,
  )
  const registry = new MediaProviderRegistry([
    youtubeProvider,
    new YtDlpProvider('soundcloud', 'SoundCloud', processRunner, ytDlp, ffmpeg),
    new YtDlpProvider(
      'instagram',
      'Instagram',
      processRunner,
      ytDlp,
      ffmpeg,
      () => settings.get().socialCookiesFile,
    ),
    new YtDlpProvider(
      'facebook',
      'Facebook',
      processRunner,
      ytDlp,
      ffmpeg,
      () => settings.get().socialCookiesFile,
    ),
    new YtDlpProvider(
      'twitter',
      'X / Twitter',
      processRunner,
      ytDlp,
      ffmpeg,
      () => settings.get().socialCookiesFile,
    ),
    new YtDlpProvider('generic', 'Outras fontes', processRunner, ytDlp, ffmpeg),
  ])
  let playlistImportService: PlaylistImportService | null = null
  const manager = new DownloadManager(
    connection.db,
    registry,
    () => settings.get().downloadDirectory,
    () => settings.get().concurrentDownloads,
    (title) => {
      playlistImportService?.syncDownloads()
      artwork.invalidate()
      void locations.scan()
      if (settings.get().notifyOnComplete && Notification.isSupported())
        new Notification({ title: 'Download concluído', body: title }).show()
    },
    () => ({
      namingTemplate: settings.get().namingTemplate,
      speedLimitKbps: settings.get().speedLimitKbps,
    }),
  )
  playlistImportService = new PlaylistImportService(
    connection.db,
    manager,
    localPlaylists,
    processRunner,
    ytDlp,
    youtubeProvider,
    () => settings.get(),
  )
  const imports = playlistImportService
  ipcMain.handle('conversion:choose-file', async (event) => {
    validSender(event)
    const window = getWindow()
    if (!window) return null
    const choice = await dialog.showOpenDialog(window, {
      title: 'Escolha uma mídia para converter',
      properties: ['openFile'],
      filters: [
        {
          name: 'Áudio e vídeo',
          extensions: [
            'mp3',
            'm4a',
            'm4p',
            'aac',
            'flac',
            'ogg',
            'opus',
            'wav',
            'mp4',
            'webm',
            'mkv',
            'mov',
            'avi',
          ],
        },
      ],
    })
    if (choice.canceled || !choice.filePaths[0]) return null
    const path = choice.filePaths[0]
    const info = await converter.inspect(path)
    conversionSource = { path, info }
    return OptionalConversionSourceSchema.parse(info)
  })
  ipcMain.handle('conversion:start', async (event, input: unknown) => {
    validSender(event)
    const { sourceId, format } = ConversionRequestSchema.parse(input)
    if (!conversionSource || conversionSource.info.id !== sourceId)
      throw new Error('Escolha o arquivo novamente.')
    if (conversionController)
      throw new Error('Uma conversão já está em andamento.')
    const controller = new AbortController()
    conversionController = controller
    const source = conversionSource
    try {
      const result = await converter.convert(
        source.path,
        source.info,
        format,
        settings.get().downloadDirectory,
        (percent) => {
          if (!event.sender.isDestroyed())
            event.sender.send('conversion:progress', { percent })
        },
        controller.signal,
      )
      convertedPath = result.path
      library.importFiles([result.path])
      return ConversionResultSchema.parse(result)
    } finally {
      conversionController = null
    }
  })
  ipcMain.handle('conversion:cancel', (event) => {
    validSender(event)
    conversionController?.abort()
  })
  ipcMain.handle('conversion:open-file', async (event, input: unknown) => {
    validSender(event)
    if (z.string().parse(input) !== convertedPath || !convertedPath)
      throw new Error('Arquivo indisponível.')
    const error = await shell.openPath(convertedPath)
    if (error) throw new Error(error)
  })
  ipcMain.handle('conversion:open-folder', (event, input: unknown) => {
    validSender(event)
    if (z.string().parse(input) !== convertedPath || !convertedPath)
      throw new Error('Arquivo indisponível.')
    shell.showItemInFolder(convertedPath)
  })
  let closed = false
  app.on('before-quit', (event) => {
    if (closed) return
    event.preventDefault()
    void Promise.allSettled([
      manager.dispose(),
      Promise.resolve().then(() => conversionController?.abort()),
      nowPlaying.dispose(),
      preview?.dispose(),
      locations.dispose(),
    ]).then(() => {
      spotify.dispose()
      connection.sqlite.close()
      closed = true
      app.quit()
    })
  })

  const validSender = (event: IpcMainInvokeEvent) => {
    if (event.sender !== getWindow()?.webContents)
      throw new Error('Invalid IPC sender')
  }
  ipcMain.handle('app:health', (event) => {
    validSender(event)
    return HealthResponseSchema.parse({
      appName: 'Orbe',
      version: app.getVersion(),
    })
  })
  ipcMain.handle('media:analyze', async (event, input: unknown) => {
    validSender(event)
    const { url, mode, page } = AnalyzeRequestSchema.parse(input)
    const selected = await registry.resolve(url)
    try {
      const result = MediaAnalysisSchema.parse(
        await selected.provider.analyze(selected.url, {
          ...(mode ? { mode } : {}),
          ...(page ? { page } : {}),
        }),
      )
      logEvent('info', 'media.analyzed', {
        provider: selected.provider.id,
        playlist: result.isPlaylist,
      })
      return result
    } catch (error) {
      const normalized = userFacingMediaError(error)
      logEvent('warn', 'media.analysis_failed', {
        provider: selected.provider.id,
        code: normalized.code,
      })
      throw normalized
    }
  })
  ipcMain.handle('media:preview', async (event, input: unknown) => {
    validSender(event)
    const { url } = AnalyzeRequestSchema.parse({ url: input })
    const selected = await registry.resolve(url)
    const preferences = settings.get()
    const cookiesFile =
      selected.provider.id === 'youtube'
        ? preferences.youtubeCookiesFile
        : ['instagram', 'facebook', 'twitter'].includes(selected.provider.id)
          ? preferences.socialCookiesFile
          : ''
    if (cookiesFile && !existsSync(cookiesFile))
      throw new AppError(
        'LOGIN_REQUIRED',
        'O arquivo cookies.txt configurado não foi encontrado. Escolha outro em Integrações.',
      )
    try {
      return await preview!.create(selected.url.href, {
        ...(cookiesFile ? { cookiesFile } : {}),
        ...(selected.provider.id === 'youtube'
          ? { browser: preferences.youtubeBrowser }
          : {}),
      })
    } catch (error) {
      throw userFacingMediaError(error)
    }
  })
  const chooseDestination = async (): Promise<string | undefined> => {
    if (!settings.get().askWhereToSave) return undefined
    const window = getWindow()
    if (!window) throw new Error('A janela do Orbe não está disponível.')
    const selection = await dialog.showOpenDialog(window, {
      title: 'Onde salvar o download?',
      defaultPath: settings.get().downloadDirectory,
      properties: ['openDirectory', 'createDirectory'],
    })
    if (selection.canceled || !selection.filePaths[0])
      throw new Error('Seleção de pasta cancelada.')
    return selection.filePaths[0]
  }
  ipcMain.handle('download:start', async (event, input: unknown) => {
    validSender(event)
    const request = DownloadStartRequestSchema.parse(input)
    return DownloadRecordSchema.parse(
      await manager.start(request, await chooseDestination()),
    )
  })
  ipcMain.handle('download:list', (event) => {
    validSender(event)
    return DownloadListResponseSchema.parse(manager.list())
  })
  ipcMain.handle('download:cancel', (event, input: unknown) => {
    validSender(event)
    manager.cancel(DownloadActionRequestSchema.parse(input).id)
  })
  ipcMain.handle('download:retry', async (event, input: unknown) => {
    validSender(event)
    const id = DownloadActionRequestSchema.parse(input).id
    return DownloadRecordSchema.parse(
      await manager.retry(id, await chooseDestination()),
    )
  })
  ipcMain.handle('download:remove', (event, input: unknown) => {
    validSender(event)
    manager.remove(DownloadActionRequestSchema.parse(input).id)
  })
  ipcMain.handle('settings:get', (event) => {
    validSender(event)
    return SettingsSchema.parse(settings.get())
  })
  ipcMain.handle('settings:save', async (event, input: unknown) => {
    validSender(event)
    const request = SaveSettingsRequestSchema.parse(input)
    const updated = await locations.saveSettings(
      request.settings,
      request.previousDirectoryAction,
    )
    await discord.setClientId(
      updated.discordClientId || process.env.ORBE_DISCORD_CLIENT_ID || '',
    )
    nowPlaying.settingsChanged()
    return updated
  })
  ipcMain.handle('now-playing:update', (event, input: unknown) => {
    validSender(event)
    nowPlaying.update(OptionalNowPlayingTrackSchema.parse(input), 'orbe')
  })
  ipcMain.handle('now-playing:get', (event) => {
    validSender(event)
    return OptionalNowPlayingTrackSchema.parse(nowPlaying.get())
  })
  ipcMain.handle('lyrics:for-track', async (event, input: unknown) => {
    validSender(event)
    const track = library.find(LyricsRequestSchema.parse(input).id)
    return LyricsResultSchema.parse(track ? await lyricsForTrack(track) : null)
  })
  ipcMain.handle('lyrics:search', async (event, input: unknown) => {
    validSender(event)
    const request = LyricsSearchSchema.parse(input)
    return LyricsResultSchema.parse(
      await searchLyrics(request.title, request.artist, request.durationMs),
    )
  })
  ipcMain.handle('lyrics:candidates', async (event, input: unknown) => {
    validSender(event)
    const request = LyricsSearchSchema.parse(input)
    return LyricsCandidatesSchema.parse(
      await searchLyricsCandidates(
        request.title,
        request.artist,
        request.durationMs,
      ),
    )
  })
  ipcMain.handle('audio:gain', async (event, input: unknown) => {
    validSender(event)
    return await loudness.gainFor(DownloadActionRequestSchema.parse(input).id)
  })
  ipcMain.handle('spotify:connect', async (event) => {
    validSender(event)
    await spotify.connect()
  })
  ipcMain.handle('spotify:disconnect', (event) => {
    validSender(event)
    spotify.disconnect()
  })
  ipcMain.handle('spotify:overview', async (event) => {
    validSender(event)
    return SpotifyOverviewSchema.parse(await spotify.overview())
  })
  ipcMain.handle('spotify:playlist-items', async (event, input: unknown) => {
    validSender(event)
    return SpotifyPlaylistItemsSchema.parse(
      await spotify.playlistItems(
        z
          .string()
          .regex(/^[A-Za-z0-9]+$/)
          .parse(input),
      ),
    )
  })
  ipcMain.handle('playlist-import:list', (event) => {
    validSender(event)
    return PlaylistImportsSchema.parse(imports.list())
  })
  ipcMain.handle('playlist-import:create', async (event, input: unknown) => {
    validSender(event)
    await imports.createFromLink(PlaylistImportLinkSchema.parse(input).url)
    return PlaylistImportsSchema.parse(imports.list())
  })
  ipcMain.handle('playlist-import:retry-source', (event, input: unknown) => {
    validSender(event)
    imports.retrySource(PlaylistImportIdSchema.parse(input).id)
  })
  ipcMain.handle('playlist-import:export', async (event, input: unknown) => {
    validSender(event)
    const id = PlaylistImportIdSchema.parse(input).id
    const window = getWindow()
    if (!window) return false
    const choice = await dialog.showOpenDialog(window, {
      title: 'Selecione a exportação de dados do Spotify',
      properties: ['openFile'],
      filters: [{ name: 'Exportação Spotify', extensions: ['zip', 'json'] }],
    })
    if (choice.canceled || !choice.filePaths[0]) return false
    await imports.importExport(id, choice.filePaths[0])
    return true
  })
  ipcMain.handle('playlist-import:match', (event, input: unknown) => {
    validSender(event)
    imports.startMatching(PlaylistImportIdSchema.parse(input).id)
  })
  ipcMain.handle('playlist-import:search', async (event, input: unknown) => {
    validSender(event)
    const { itemId, query } = PlaylistMatchSearchSchema.parse(input)
    return z
      .array(YouTubeCandidateSchema)
      .parse(await imports.searchItem(itemId, query))
  })
  ipcMain.handle('playlist-import:choose', (event, input: unknown) => {
    validSender(event)
    const { itemId, youtubeUrl } = PlaylistMatchChoiceSchema.parse(input)
    imports.chooseMatch(itemId, youtubeUrl)
  })
  ipcMain.handle('playlist-import:download', (event, input: unknown) => {
    validSender(event)
    imports.startDownloads(PlaylistImportIdSchema.parse(input).id)
  })
  ipcMain.handle('playlist-import:delete', (event, input: unknown) => {
    validSender(event)
    imports.delete(PlaylistImportIdSchema.parse(input).id)
  })
  ipcMain.handle('youtube:connect', async (event) => {
    validSender(event)
    await google.connect()
  })
  ipcMain.handle('youtube:disconnect', (event) => {
    validSender(event)
    google.disconnect()
  })
  ipcMain.handle('youtube:overview', async (event) => {
    validSender(event)
    return YouTubeOverviewSchema.parse(await google.overview())
  })
  ipcMain.handle('youtube:playlist-items', async (event, input: unknown) => {
    validSender(event)
    return z.array(YouTubeItemSchema).parse(
      await google.playlistItems(
        z
          .string()
          .regex(/^[A-Za-z0-9_-]+$/)
          .parse(input),
      ),
    )
  })
  ipcMain.handle('settings:choose-directory', async (event) => {
    validSender(event)
    const window = getWindow()
    if (!window) return null
    const response = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
    })
    return response.canceled ? null : (response.filePaths[0] ?? null)
  })
  ipcMain.handle('settings:choose-cookies-file', async (event) => {
    validSender(event)
    const window = getWindow()
    if (!window) return null
    const response = await dialog.showOpenDialog(window, {
      title: 'Selecione um arquivo cookies.txt',
      properties: ['openFile'],
      filters: [{ name: 'Cookies Netscape', extensions: ['txt'] }],
    })
    return response.canceled ? null : (response.filePaths[0] ?? null)
  })
  ipcMain.handle('settings:open-directory', async (event) => {
    validSender(event)
    const error = await shell.openPath(settings.get().downloadDirectory)
    if (error) throw new Error(error)
  })
  ipcMain.handle('onboarding:status', (event) => {
    validSender(event)
    return settings.onboardingComplete()
  })
  ipcMain.handle('onboarding:finish', (event) => {
    validSender(event)
    settings.finishOnboarding()
  })
  const recordFile = (id: string) => {
    const record = manager.list().find((item) => item.id === id)
    if (!record?.filePath || record.status !== 'completed')
      throw new Error('O arquivo não está disponível.')
    return record.filePath
  }
  ipcMain.handle('media:open-file', async (event, input: unknown) => {
    validSender(event)
    const error = await shell.openPath(
      recordFile(DownloadActionRequestSchema.parse(input).id),
    )
    if (error) throw new Error(error)
  })
  ipcMain.handle('media:open-folder', (event, input: unknown) => {
    validSender(event)
    shell.showItemInFolder(
      recordFile(DownloadActionRequestSchema.parse(input).id),
    )
  })
  ipcMain.handle('library:list', (event) => {
    validSender(event)
    return LibraryListResponseSchema.parse(library.list())
  })
  const locations = new LibraryLocationsService(
    library,
    settings,
    () =>
      !!conversionController ||
      manager
        .list()
        .some((item) =>
          ['queued', 'downloading', 'processing', 'analyzing'].includes(
            item.status,
          ),
        ),
  )
  locations.start()
  ipcMain.handle('library:locations', (event) => {
    validSender(event)
    return LibraryLocationsSchema.parse(locations.snapshot())
  })
  ipcMain.handle('library:scan', async (event) => {
    validSender(event)
    return LibraryLocationsSchema.parse(await locations.scan())
  })
  const chooseLibraryDirectory = async (
    title: string,
  ): Promise<string | null> => {
    const window = getWindow()
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      title,
      properties: ['openDirectory'],
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }
  ipcMain.handle('library:add-directory', async (event) => {
    validSender(event)
    const path = await chooseLibraryDirectory(
      'Adicionar pasta de músicas e vídeos',
    )
    return LibraryLocationsSchema.parse(
      path ? await locations.add(path) : locations.snapshot(),
    )
  })
  ipcMain.handle('library:remove-directory', async (event, input: unknown) => {
    validSender(event)
    return LibraryLocationsSchema.parse(
      await locations.remove(z.string().min(1).parse(input)),
    )
  })
  ipcMain.handle(
    'library:relocate-directory',
    async (event, input: unknown) => {
      validSender(event)
      const previous = z.string().min(1).parse(input)
      const path = await chooseLibraryDirectory('Onde esta pasta está agora?')
      const result = path
        ? await locations.relocate(previous, path)
        : locations.snapshot()
      artwork.invalidate()
      return LibraryLocationsSchema.parse(result)
    },
  )
  ipcMain.handle('library:locate-file', async (event, input: unknown) => {
    validSender(event)
    const id = DownloadActionRequestSchema.parse(input).id
    const window = getWindow()
    if (!window) return locations.snapshot()
    const result = await dialog.showOpenDialog(window, {
      title: 'Localizar o arquivo que foi movido',
      properties: ['openFile'],
      filters: [
        {
          name: 'Músicas e vídeos',
          extensions: [
            'mp3',
            'm4a',
            'aac',
            'flac',
            'ogg',
            'wav',
            'opus',
            'mp4',
            'webm',
          ],
        },
      ],
    })
    const report =
      !result.canceled && result.filePaths[0]
        ? await locations.locateFile(id, result.filePaths[0])
        : locations.snapshot()
    artwork.invalidate()
    return LibraryLocationsSchema.parse(report)
  })
  ipcMain.handle('library:redownload', async (event, input: unknown) => {
    validSender(event)
    const id = DownloadActionRequestSchema.parse(input).id
    const report = await locations.scan()
    const missing = report.missing.find((entry) => entry.item.id === id)
    if (!missing?.canDownloadAgain || !missing.downloadId)
      throw new Error(
        'Este arquivo não pode ser baixado novamente agora. Localize-o no computador ou verifique o download em andamento.',
      )
    const download = await manager.retry(
      missing.downloadId,
      settings.get().downloadDirectory,
    )
    void locations.scan()
    return DownloadRecordSchema.parse(download)
  })
  ipcMain.handle('local-playlists:list', (event) => {
    validSender(event)
    return LocalPlaylistsSchema.parse(localPlaylists.list())
  })
  ipcMain.handle('local-playlists:create', (event, input: unknown) => {
    validSender(event)
    const { name, description } = LocalPlaylistInputSchema.parse(input)
    return LocalPlaylistSchema.parse(localPlaylists.create(name, description))
  })
  ipcMain.handle('local-playlists:update', (event, input: unknown) => {
    validSender(event)
    const { id, name, description } = LocalPlaylistInputSchema.extend({
      id: z.uuid(),
    }).parse(input)
    localPlaylists.update(id, name, description)
  })
  ipcMain.handle('local-playlists:delete', (event, input: unknown) => {
    validSender(event)
    localPlaylists.delete(z.uuid().parse(input))
  })
  ipcMain.handle('local-playlists:add', (event, input: unknown) => {
    validSender(event)
    const { playlistId, mediaId } = LocalPlaylistItemInputSchema.parse(input)
    localPlaylists.add(playlistId, mediaId)
  })
  ipcMain.handle('local-playlists:remove', (event, input: unknown) => {
    validSender(event)
    const { playlistId, itemId } = LocalPlaylistEntryInputSchema.parse(input)
    localPlaylists.remove(playlistId, itemId)
  })
  ipcMain.handle('local-playlists:move', (event, input: unknown) => {
    validSender(event)
    const { playlistId, itemId, direction } =
      LocalPlaylistEntryInputSchema.extend({
        direction: z.enum(['up', 'down']),
      }).parse(input)
    localPlaylists.move(playlistId, itemId, direction)
  })
  ipcMain.handle('library:duration', async (event, input: unknown) => {
    validSender(event)
    const id = DownloadActionRequestSchema.parse(input).id
    const record = library.find(id)
    if (!record) return null
    if (record.durationMs != null && record.durationMs > 0)
      return record.durationMs
    try {
      const { stdout } = await processRunner.run(
        ffprobe,
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          record.filePath,
        ],
        { timeoutMs: 15000 },
      )
      const seconds = Number(stdout.trim())
      if (!Number.isFinite(seconds) || seconds <= 0) return null
      const durationMs = Math.round(seconds * 1000)
      library.setDuration(id, durationMs)
      return durationMs
    } catch {
      return null
    }
  })
  ipcMain.handle('library:import', async (event) => {
    validSender(event)
    const window = getWindow()
    if (!window) return []
    const choice = await dialog.showOpenDialog(window, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Mídia',
          extensions: ['mp3', 'm4a', 'aac', 'flac', 'ogg', 'mp4', 'webm'],
        },
      ],
    })
    return LibraryListResponseSchema.parse(
      choice.canceled ? library.list() : library.importFiles(choice.filePaths),
    )
  })
  ipcMain.handle('library:favorite', (event, input: unknown) => {
    validSender(event)
    const { id, favorite } = z
      .object({ id: z.uuid(), favorite: z.boolean() })
      .strict()
      .parse(input)
    library.setFavorite(id, favorite)
  })
  ipcMain.handle('library:remove', (event, input: unknown) => {
    validSender(event)
    library.remove(DownloadActionRequestSchema.parse(input).id)
  })
  ipcMain.handle('library:played', (event, input: unknown) => {
    validSender(event)
    library.markPlayed(DownloadActionRequestSchema.parse(input).id)
  })
  const libraryFile = (id: string) => {
    const record = library.find(id)
    if (!record) throw new Error('Item da biblioteca não encontrado.')
    return record.filePath
  }
  ipcMain.handle('library:open-file', async (event, input: unknown) => {
    validSender(event)
    const error = await shell.openPath(
      libraryFile(DownloadActionRequestSchema.parse(input).id),
    )
    if (error) throw new Error(error)
  })
  ipcMain.handle('library:open-folder', (event, input: unknown) => {
    validSender(event)
    shell.showItemInFolder(
      libraryFile(DownloadActionRequestSchema.parse(input).id),
    )
  })
  ipcMain.handle('library:delete-file', async (event, input: unknown) => {
    validSender(event)
    const id = DownloadActionRequestSchema.parse(input).id
    const filePath = libraryFile(id)
    const window = getWindow()
    if (!window) return false
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      title: 'Excluir arquivo',
      message: 'Excluir este arquivo do computador?',
      detail: filePath,
      buttons: ['Cancelar', 'Excluir arquivo'],
      defaultId: 0,
      cancelId: 0,
    })
    if (choice !== 1) return false
    if (existsSync(filePath)) await unlink(filePath)
    library.remove(id)
    return true
  })
  return manager
}
