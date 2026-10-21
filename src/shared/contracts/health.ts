import { z } from 'zod'
import type {
  DownloadRecord,
  DownloadStartRequest,
  LibraryRecord,
  MediaAnalysis,
  NowPlayingTrack,
  Settings,
} from './media'
import type { SpotifyOverview } from './spotify'
import type { YouTubeItem, YouTubeOverview } from './youtube'
import type { LyricsResult, LyricsCandidate } from './lyrics'
import type { LocalPlaylist } from './local-playlists'
import type { PlaylistImport, YouTubeCandidate } from './playlist-import'
import type {
  LibraryLocations,
  PreviousDirectoryAction,
} from './library-locations'
import type {
  ConversionFormat,
  ConversionResult,
  ConversionSource,
} from './converter'

export const HealthRequestSchema = z.object({}).strict()
export const HealthResponseSchema = z.object({
  appName: z.literal('Orbe'),
  version: z.string(),
})

export interface OrbeApi {
  health(): Promise<z.infer<typeof HealthResponseSchema>>
  setFullscreen(enabled: boolean): Promise<boolean>
  analyze(
    url: string,
    options?: { mode?: 'video' | 'playlist'; page?: number },
  ): Promise<MediaAnalysis>
  previewAudio(url: string): Promise<string>
  startDownload(request: DownloadStartRequest): Promise<DownloadRecord>
  listDownloads(): Promise<DownloadRecord[]>
  cancelDownload(id: string): Promise<void>
  retryDownload(id: string): Promise<DownloadRecord>
  removeDownload(id: string): Promise<void>
  getSettings(): Promise<Settings>
  saveSettings(
    settings: Settings,
    previousDirectoryAction?: PreviousDirectoryAction,
  ): Promise<Settings>
  libraryLocations(): Promise<LibraryLocations>
  scanLibraryLocations(): Promise<LibraryLocations>
  addLibraryDirectory(): Promise<LibraryLocations>
  removeLibraryDirectory(path: string): Promise<LibraryLocations>
  relocateLibraryDirectory(path: string): Promise<LibraryLocations>
  locateLibraryFile(id: string): Promise<LibraryLocations>
  redownloadLibraryFile(id: string): Promise<DownloadRecord>
  chooseDownloadDirectory(): Promise<string | null>
  chooseCookiesFile(): Promise<string | null>
  openFile(id: string): Promise<void>
  openFolder(id: string): Promise<void>
  listLibrary(): Promise<LibraryRecord[]>
  artworkForTrack(id: string): Promise<string | null>
  listLocalPlaylists(): Promise<LocalPlaylist[]>
  createLocalPlaylist(input: {
    name: string
    description: string
  }): Promise<LocalPlaylist>
  updateLocalPlaylist(
    id: string,
    input: { name: string; description: string },
  ): Promise<void>
  deleteLocalPlaylist(id: string): Promise<void>
  addLocalPlaylistItem(playlistId: string, mediaId: string): Promise<void>
  removeLocalPlaylistItem(playlistId: string, itemId: string): Promise<void>
  moveLocalPlaylistItem(
    playlistId: string,
    itemId: string,
    direction: 'up' | 'down',
  ): Promise<void>
  mediaDuration(id: string): Promise<number | null>
  importLocalFiles(): Promise<LibraryRecord[]>
  setFavorite(id: string, favorite: boolean): Promise<void>
  removeFromLibrary(id: string): Promise<void>
  markPlayed(id: string): Promise<void>
  openLibraryFile(id: string): Promise<void>
  openLibraryFolder(id: string): Promise<void>
  deleteLibraryFile(id: string): Promise<boolean>
  updateNowPlaying(track: NowPlayingTrack | null): Promise<void>
  getNowPlaying(): Promise<NowPlayingTrack | null>
  lyricsForTrack(id: string): Promise<LyricsResult>
  searchLyricsCandidates(input: {
    title: string
    artist: string
    durationMs: number | null
  }): Promise<LyricsCandidate[]>
  searchLyrics(input: {
    title: string
    artist: string
    durationMs: number | null
  }): Promise<LyricsResult>
  audioGain(id: string): Promise<number>
  connectSpotify(): Promise<void>
  disconnectSpotify(): Promise<void>
  spotifyOverview(): Promise<SpotifyOverview>
  spotifyPlaylistItems(
    id: string,
  ): Promise<{ title: string; artist: string; url: string | null }[]>
  listPlaylistImports(): Promise<PlaylistImport[]>
  createPlaylistImport(url: string): Promise<PlaylistImport[]>
  retryPlaylistSource(id: string): Promise<void>
  importSpotifyExport(id: string): Promise<boolean>
  startPlaylistMatching(id: string): Promise<void>
  searchPlaylistItem(itemId: string, query: string): Promise<YouTubeCandidate[]>
  choosePlaylistMatch(itemId: string, youtubeUrl: string | null): Promise<void>
  startPlaylistDownloads(id: string): Promise<void>
  deletePlaylistImport(id: string): Promise<void>
  connectYouTube(): Promise<void>
  disconnectYouTube(): Promise<void>
  youTubeOverview(): Promise<YouTubeOverview>
  youTubePlaylistItems(id: string): Promise<YouTubeItem[]>
  onboardingComplete(): Promise<boolean>
  finishOnboarding(): Promise<void>
  openDownloadsFolder(): Promise<void>
  chooseConversionFile(): Promise<ConversionSource | null>
  startConversion(
    sourceId: string,
    format: ConversionFormat,
  ): Promise<ConversionResult>
  cancelConversion(): Promise<void>
  onConversionProgress(listener: (percent: number) => void): () => void
  openConvertedFile(path: string): Promise<void>
  openConvertedFolder(path: string): Promise<void>
}
