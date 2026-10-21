import { z } from 'zod'

export const ProviderIdSchema = z.enum([
  'youtube',
  'soundcloud',
  'instagram',
  'facebook',
  'twitter',
  'generic',
  'local',
])
export const DownloadStatusSchema = z.enum([
  'queued',
  'analyzing',
  'downloading',
  'processing',
  'completed',
  'failed',
  'cancelled',
])
export const MediaTypeSchema = z.enum(['audio', 'video'])

export const MediaFormatSchema = z.object({
  id: z.string(),
  extension: z.string(),
  mediaType: MediaTypeSchema,
  quality: z.string(),
  codec: z.string().nullable(),
  fps: z.number().nullable(),
  bitrateKbps: z.number().nullable(),
  fileSize: z.number().nullable(),
  hasAudio: z.boolean(),
})

export const PlaylistItemSchema = z.object({
  id: z.string(),
  url: z.url(),
  title: z.string(),
  thumbnail: z.string().nullable(),
  durationMs: z.number().nullable(),
})

export const MediaAnalysisSchema = z.object({
  provider: ProviderIdSchema,
  sourceUrl: z.url(),
  sourceMediaId: z.string().nullable(),
  title: z.string(),
  artist: z.string().nullable(),
  album: z.string().nullable(),
  channel: z.string().nullable(),
  thumbnail: z.string().nullable(),
  durationMs: z.number().nullable(),
  isPlaylist: z.boolean(),
  items: z.array(PlaylistItemSchema),
  formats: z.array(MediaFormatSchema),
  nextPage: z.number().int().positive().nullable().optional(),
})

export const AnalyzeRequestSchema = z
  .object({
    url: z.url(),
    mode: z.enum(['video', 'playlist']).optional(),
    page: z.number().int().min(1).max(200).optional(),
  })
  .strict()
export const DownloadStartRequestSchema = z
  .object({
    url: z.url(),
    title: z.string().min(1),
    provider: ProviderIdSchema,
    mediaType: MediaTypeSchema,
    formatId: z.string().min(1),
    extension: z.string().min(1),
    hasAudio: z.boolean(),
    quality: z.string(),
    thumbnail: z.string().nullable(),
    artist: z.string().nullable(),
    channel: z.string().nullable(),
    durationMs: z.number().nullable(),
  })
  .strict()
export const DownloadActionRequestSchema = z.object({ id: z.uuid() }).strict()

export const DownloadRecordSchema = z.object({
  id: z.uuid(),
  provider: ProviderIdSchema,
  sourceUrl: z.url(),
  title: z.string(),
  artist: z.string().nullable(),
  channel: z.string().nullable(),
  thumbnail: z.string().nullable(),
  durationMs: z.number().nullable(),
  mediaType: MediaTypeSchema,
  format: z.string(),
  quality: z.string().nullable(),
  fileSize: z.number().nullable(),
  filePath: z.string().nullable(),
  status: DownloadStatusSchema,
  progress: z.number(),
  downloadedBytes: z.number().nullable(),
  speedBytesPerSecond: z.number().nullable(),
  etaSeconds: z.number().nullable(),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
  errorMessage: z.string().nullable(),
})

export const SettingsSchema = z.object({
  downloadDirectory: z.string().min(1),
  libraryDirectories: z.array(z.string().min(1)).max(100).default([]),
  concurrentDownloads: z.number().int().min(1).max(4),
  theme: z.enum(['system', 'light', 'dark']),
  notifyOnComplete: z.boolean().default(true),
  askWhereToSave: z.boolean().default(false),
  namingTemplate: z
    .enum(['title', 'title-quality', 'channel-title'])
    .default('title'),
  speedLimitKbps: z.number().int().min(0).max(1000000).default(0),
  socialCookiesFile: z.string().default(''),
  youtubeCookiesFile: z.string().default(''),
  youtubeBrowser: z
    .enum(['none', 'chrome', 'edge', 'firefox', 'brave'])
    .default('none'),
  preferredDownload: z
    .object({
      kind: z.enum(['video', 'audio']),
      videoExtension: z.enum(['mp4', 'webm']),
      videoQuality: z.enum(['best', '1080p', '720p', '480p']),
      audioExtension: z.enum(['mp3', 'm4a', 'opus']),
    })
    .default({
      kind: 'video',
      videoExtension: 'mp4',
      videoQuality: 'best',
      audioExtension: 'mp3',
    }),
  discord: z
    .object({
      enabled: z.boolean(),
      showTitle: z.boolean(),
      showArtist: z.boolean(),
      showAlbum: z.boolean(),
      showArtwork: z.boolean(),
      showPlaybackTime: z.boolean(),
      source: z.enum(['automatic', 'orbe', 'spotify']),
      paused: z.enum(['clear', 'show']),
      priority: z
        .enum(['automatic', 'spotify-native', 'orbe'])
        .default('automatic'),
    })
    .default({
      enabled: false,
      showTitle: true,
      showArtist: true,
      showAlbum: false,
      showArtwork: false,
      showPlaybackTime: true,
      source: 'automatic',
      paused: 'clear',
      priority: 'automatic',
    }),
  spotifyClientId: z.string().default(''),
  discordClientId: z.string().default(''),
  googleClientId: z.string().default(''),
})
export const DownloadListResponseSchema = z.array(DownloadRecordSchema)
export const OptionalDirectorySchema = z.string().nullable()
export const LibraryRecordSchema = z.object({
  id: z.uuid(),
  provider: ProviderIdSchema,
  mediaType: MediaTypeSchema,
  title: z.string(),
  artist: z.string().nullable(),
  album: z.string().nullable(),
  thumbnail: z.string().nullable(),
  durationMs: z.number().nullable(),
  format: z.string(),
  filePath: z.string(),
  favorite: z.boolean(),
  playCount: z.number(),
  createdAt: z.number(),
})
export const LibraryListResponseSchema = z.array(LibraryRecordSchema)
export type LibraryRecord = z.infer<typeof LibraryRecordSchema>

export const NowPlayingTrackSchema = z.object({
  source: z.enum(['orbe', 'spotify']),
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  artwork: z.string().nullable(),
  durationMs: z.number().nonnegative(),
  progressMs: z.number().nonnegative(),
  isPlaying: z.boolean(),
  externalUrl: z.string().nullable(),
})
export const OptionalNowPlayingTrackSchema = NowPlayingTrackSchema.nullable()
export type NowPlayingTrack = z.infer<typeof NowPlayingTrackSchema>

export type MediaFormat = z.infer<typeof MediaFormatSchema>
export type MediaAnalysis = z.infer<typeof MediaAnalysisSchema>
export type DownloadStartRequest = z.infer<typeof DownloadStartRequestSchema>
export type DownloadRecord = z.infer<typeof DownloadRecordSchema>
export type Settings = z.infer<typeof SettingsSchema>
