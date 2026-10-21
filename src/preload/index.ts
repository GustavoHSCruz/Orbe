import { contextBridge, ipcRenderer } from 'electron'
import { HealthResponseSchema, type OrbeApi } from '../shared/contracts/health'
import {
  AnalyzeRequestSchema,
  DownloadActionRequestSchema,
  DownloadListResponseSchema,
  DownloadRecordSchema,
  DownloadStartRequestSchema,
  LibraryListResponseSchema,
  MediaAnalysisSchema,
  OptionalDirectorySchema,
  OptionalNowPlayingTrackSchema,
  SettingsSchema,
} from '../shared/contracts/media'
import { z } from 'zod'
import {
  LibraryLocationsSchema,
  SaveSettingsRequestSchema,
} from '../shared/contracts/library-locations'
import {
  ConversionFormatSchema,
  ConversionProgressSchema,
  ConversionRequestSchema,
  ConversionResultSchema,
  OptionalConversionSourceSchema,
} from '../shared/contracts/converter'
import {
  LyricsRequestSchema,
  LyricsCandidatesSchema,
  LyricsResultSchema,
  LyricsSearchSchema,
} from '../shared/contracts/lyrics'
import {
  SpotifyOverviewSchema,
  SpotifyPlaylistItemsSchema,
} from '../shared/contracts/spotify'
import {
  YouTubeItemSchema,
  YouTubeOverviewSchema,
} from '../shared/contracts/youtube'
import {
  LocalPlaylistInputSchema,
  LocalPlaylistItemInputSchema,
  LocalPlaylistEntryInputSchema,
  LocalPlaylistSchema,
  LocalPlaylistsSchema,
} from '../shared/contracts/local-playlists'
import {
  PlaylistImportIdSchema,
  PlaylistImportLinkSchema,
  PlaylistImportsSchema,
  PlaylistMatchChoiceSchema,
  PlaylistMatchSearchSchema,
  YouTubeCandidateSchema,
} from '../shared/contracts/playlist-import'

const api: OrbeApi = {
  health: async () =>
    HealthResponseSchema.parse(await ipcRenderer.invoke('app:health')),
  chooseConversionFile: async () =>
    OptionalConversionSourceSchema.parse(
      await ipcRenderer.invoke('conversion:choose-file'),
    ),
  startConversion: async (sourceId, format) =>
    ConversionResultSchema.parse(
      await ipcRenderer.invoke(
        'conversion:start',
        ConversionRequestSchema.parse({
          sourceId,
          format: ConversionFormatSchema.parse(format),
        }),
      ),
    ),
  cancelConversion: async () => {
    await ipcRenderer.invoke('conversion:cancel')
  },
  onConversionProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown) =>
      listener(ConversionProgressSchema.parse(value).percent)
    ipcRenderer.on('conversion:progress', handler)
    return () => ipcRenderer.removeListener('conversion:progress', handler)
  },
  openConvertedFile: async (path) => {
    await ipcRenderer.invoke('conversion:open-file', z.string().parse(path))
  },
  openConvertedFolder: async (path) => {
    await ipcRenderer.invoke('conversion:open-folder', z.string().parse(path))
  },
  setFullscreen: async (enabled) =>
    z
      .boolean()
      .parse(
        await ipcRenderer.invoke('app:fullscreen', z.boolean().parse(enabled)),
      ),
  analyze: async (url, options) =>
    MediaAnalysisSchema.parse(
      await ipcRenderer.invoke(
        'media:analyze',
        AnalyzeRequestSchema.parse({ url, ...options }),
      ),
    ),
  previewAudio: async (url) =>
    z
      .string()
      .startsWith('orbe-media://preview/')
      .parse(await ipcRenderer.invoke('media:preview', z.url().parse(url))),
  startDownload: async (request) =>
    DownloadRecordSchema.parse(
      await ipcRenderer.invoke(
        'download:start',
        DownloadStartRequestSchema.parse(request),
      ),
    ),
  listDownloads: async () =>
    DownloadListResponseSchema.parse(await ipcRenderer.invoke('download:list')),
  cancelDownload: async (id) => {
    await ipcRenderer.invoke(
      'download:cancel',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  retryDownload: async (id) =>
    DownloadRecordSchema.parse(
      await ipcRenderer.invoke(
        'download:retry',
        DownloadActionRequestSchema.parse({ id }),
      ),
    ),
  removeDownload: async (id) => {
    await ipcRenderer.invoke(
      'download:remove',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  getSettings: async () =>
    SettingsSchema.parse(await ipcRenderer.invoke('settings:get')),
  saveSettings: async (settings, previousDirectoryAction) =>
    SettingsSchema.parse(
      await ipcRenderer.invoke(
        'settings:save',
        SaveSettingsRequestSchema.parse({ settings, previousDirectoryAction }),
      ),
    ),
  libraryLocations: async () =>
    LibraryLocationsSchema.parse(await ipcRenderer.invoke('library:locations')),
  scanLibraryLocations: async () =>
    LibraryLocationsSchema.parse(await ipcRenderer.invoke('library:scan')),
  addLibraryDirectory: async () =>
    LibraryLocationsSchema.parse(
      await ipcRenderer.invoke('library:add-directory'),
    ),
  removeLibraryDirectory: async (path) =>
    LibraryLocationsSchema.parse(
      await ipcRenderer.invoke(
        'library:remove-directory',
        z.string().min(1).parse(path),
      ),
    ),
  relocateLibraryDirectory: async (path) =>
    LibraryLocationsSchema.parse(
      await ipcRenderer.invoke(
        'library:relocate-directory',
        z.string().min(1).parse(path),
      ),
    ),
  locateLibraryFile: async (id) =>
    LibraryLocationsSchema.parse(
      await ipcRenderer.invoke(
        'library:locate-file',
        DownloadActionRequestSchema.parse({ id }),
      ),
    ),
  redownloadLibraryFile: async (id) =>
    DownloadRecordSchema.parse(
      await ipcRenderer.invoke(
        'library:redownload',
        DownloadActionRequestSchema.parse({ id }),
      ),
    ),
  chooseDownloadDirectory: async () =>
    OptionalDirectorySchema.parse(
      await ipcRenderer.invoke('settings:choose-directory'),
    ),
  chooseCookiesFile: async () =>
    OptionalDirectorySchema.parse(
      await ipcRenderer.invoke('settings:choose-cookies-file'),
    ),
  openFile: async (id) => {
    await ipcRenderer.invoke(
      'media:open-file',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  openFolder: async (id) => {
    await ipcRenderer.invoke(
      'media:open-folder',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  listLibrary: async () =>
    LibraryListResponseSchema.parse(await ipcRenderer.invoke('library:list')),
  artworkForTrack: async (id) =>
    z
      .string()
      .nullable()
      .parse(
        await ipcRenderer.invoke(
          'artwork:for-track',
          DownloadActionRequestSchema.parse({ id }),
        ),
      ),
  listLocalPlaylists: async () =>
    LocalPlaylistsSchema.parse(
      await ipcRenderer.invoke('local-playlists:list'),
    ),
  createLocalPlaylist: async (input) =>
    LocalPlaylistSchema.parse(
      await ipcRenderer.invoke(
        'local-playlists:create',
        LocalPlaylistInputSchema.parse(input),
      ),
    ),
  updateLocalPlaylist: async (id, input) => {
    await ipcRenderer.invoke(
      'local-playlists:update',
      LocalPlaylistInputSchema.extend({ id: z.uuid() }).parse({ id, ...input }),
    )
  },
  deleteLocalPlaylist: async (id) => {
    await ipcRenderer.invoke('local-playlists:delete', z.uuid().parse(id))
  },
  addLocalPlaylistItem: async (playlistId, mediaId) => {
    await ipcRenderer.invoke(
      'local-playlists:add',
      LocalPlaylistItemInputSchema.parse({ playlistId, mediaId }),
    )
  },
  removeLocalPlaylistItem: async (playlistId, itemId) => {
    await ipcRenderer.invoke(
      'local-playlists:remove',
      LocalPlaylistEntryInputSchema.parse({ playlistId, itemId }),
    )
  },
  moveLocalPlaylistItem: async (playlistId, itemId, direction) => {
    await ipcRenderer.invoke(
      'local-playlists:move',
      LocalPlaylistEntryInputSchema.extend({
        direction: z.enum(['up', 'down']),
      }).parse({ playlistId, itemId, direction }),
    )
  },
  mediaDuration: async (id) =>
    z
      .number()
      .nonnegative()
      .nullable()
      .parse(
        await ipcRenderer.invoke(
          'library:duration',
          DownloadActionRequestSchema.parse({ id }),
        ),
      ),
  importLocalFiles: async () =>
    LibraryListResponseSchema.parse(await ipcRenderer.invoke('library:import')),
  setFavorite: async (id, favorite) => {
    await ipcRenderer.invoke(
      'library:favorite',
      z
        .object({ id: z.uuid(), favorite: z.boolean() })
        .strict()
        .parse({ id, favorite }),
    )
  },
  removeFromLibrary: async (id) => {
    await ipcRenderer.invoke(
      'library:remove',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  markPlayed: async (id) => {
    await ipcRenderer.invoke(
      'library:played',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  openLibraryFile: async (id) => {
    await ipcRenderer.invoke(
      'library:open-file',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  openLibraryFolder: async (id) => {
    await ipcRenderer.invoke(
      'library:open-folder',
      DownloadActionRequestSchema.parse({ id }),
    )
  },
  deleteLibraryFile: async (id) =>
    z
      .boolean()
      .parse(
        await ipcRenderer.invoke(
          'library:delete-file',
          DownloadActionRequestSchema.parse({ id }),
        ),
      ),
  updateNowPlaying: async (track) => {
    await ipcRenderer.invoke(
      'now-playing:update',
      OptionalNowPlayingTrackSchema.parse(track),
    )
  },
  getNowPlaying: async () =>
    OptionalNowPlayingTrackSchema.parse(
      await ipcRenderer.invoke('now-playing:get'),
    ),
  lyricsForTrack: async (id) =>
    LyricsResultSchema.parse(
      await ipcRenderer.invoke(
        'lyrics:for-track',
        LyricsRequestSchema.parse({ id }),
      ),
    ),
  searchLyrics: async (input) =>
    LyricsResultSchema.parse(
      await ipcRenderer.invoke(
        'lyrics:search',
        LyricsSearchSchema.parse(input),
      ),
    ),
  searchLyricsCandidates: async (input) =>
    LyricsCandidatesSchema.parse(
      await ipcRenderer.invoke(
        'lyrics:candidates',
        LyricsSearchSchema.parse(input),
      ),
    ),
  audioGain: async (id) =>
    z
      .number()
      .positive()
      .parse(
        await ipcRenderer.invoke(
          'audio:gain',
          DownloadActionRequestSchema.parse({ id }),
        ),
      ),
  connectSpotify: async () => {
    await ipcRenderer.invoke('spotify:connect')
  },
  disconnectSpotify: async () => {
    await ipcRenderer.invoke('spotify:disconnect')
  },
  spotifyOverview: async () =>
    SpotifyOverviewSchema.parse(await ipcRenderer.invoke('spotify:overview')),
  spotifyPlaylistItems: async (id) =>
    SpotifyPlaylistItemsSchema.parse(
      await ipcRenderer.invoke(
        'spotify:playlist-items',
        z
          .string()
          .regex(/^[A-Za-z0-9]+$/)
          .parse(id),
      ),
    ),
  listPlaylistImports: async () =>
    PlaylistImportsSchema.parse(
      await ipcRenderer.invoke('playlist-import:list'),
    ),
  createPlaylistImport: async (url) =>
    PlaylistImportsSchema.parse(
      await ipcRenderer.invoke(
        'playlist-import:create',
        PlaylistImportLinkSchema.parse({ url }),
      ),
    ),
  retryPlaylistSource: async (id) => {
    await ipcRenderer.invoke(
      'playlist-import:retry-source',
      PlaylistImportIdSchema.parse({ id }),
    )
  },
  importSpotifyExport: async (id) =>
    z
      .boolean()
      .parse(
        await ipcRenderer.invoke(
          'playlist-import:export',
          PlaylistImportIdSchema.parse({ id }),
        ),
      ),
  startPlaylistMatching: async (id) => {
    await ipcRenderer.invoke(
      'playlist-import:match',
      PlaylistImportIdSchema.parse({ id }),
    )
  },
  searchPlaylistItem: async (itemId, query) =>
    z
      .array(YouTubeCandidateSchema)
      .parse(
        await ipcRenderer.invoke(
          'playlist-import:search',
          PlaylistMatchSearchSchema.parse({ itemId, query }),
        ),
      ),
  choosePlaylistMatch: async (itemId, youtubeUrl) => {
    await ipcRenderer.invoke(
      'playlist-import:choose',
      PlaylistMatchChoiceSchema.parse({ itemId, youtubeUrl }),
    )
  },
  startPlaylistDownloads: async (id) => {
    await ipcRenderer.invoke(
      'playlist-import:download',
      PlaylistImportIdSchema.parse({ id }),
    )
  },
  deletePlaylistImport: async (id) => {
    await ipcRenderer.invoke(
      'playlist-import:delete',
      PlaylistImportIdSchema.parse({ id }),
    )
  },
  connectYouTube: async () => {
    await ipcRenderer.invoke('youtube:connect')
  },
  disconnectYouTube: async () => {
    await ipcRenderer.invoke('youtube:disconnect')
  },
  youTubeOverview: async () =>
    YouTubeOverviewSchema.parse(await ipcRenderer.invoke('youtube:overview')),
  youTubePlaylistItems: async (id) =>
    z.array(YouTubeItemSchema).parse(
      await ipcRenderer.invoke(
        'youtube:playlist-items',
        z
          .string()
          .regex(/^[A-Za-z0-9_-]+$/)
          .parse(id),
      ),
    ),
  onboardingComplete: async () =>
    z.boolean().parse(await ipcRenderer.invoke('onboarding:status')),
  finishOnboarding: async () => {
    await ipcRenderer.invoke('onboarding:finish')
  },
  openDownloadsFolder: async () => {
    await ipcRenderer.invoke('settings:open-directory')
  },
}

contextBridge.exposeInMainWorld('orbe', api)
