import { z } from 'zod'

export const YouTubeCandidateSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  url: z.url(),
  title: z.string(),
  channel: z.string().nullable(),
  durationMs: z.number().nullable(),
  score: z.number(),
})
export type YouTubeCandidate = z.infer<typeof YouTubeCandidateSchema>

export const PlaylistImportItemSchema = z.object({
  id: z.uuid(),
  position: z.number().int().nonnegative(),
  spotifyId: z.string(),
  title: z.string().nullable(),
  artist: z.string().nullable(),
  durationMs: z.number().nullable(),
  matchStatus: z.enum(['pending', 'searching', 'matched', 'review', 'skipped', 'error']),
  candidates: z.array(YouTubeCandidateSchema),
  youtubeUrl: z.url().nullable(),
  downloadId: z.uuid().nullable(),
  downloadStatus: z.string().nullable(),
  errorMessage: z.string().nullable(),
})
export const PlaylistImportSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  sourceUrl: z.url(),
  origin: z.enum(['public', 'export']),
  expectedCount: z.number().int().nonnegative().nullable(),
  complete: z.boolean(),
  matching: z.boolean(),
  downloading: z.boolean(),
  localPlaylistId: z.uuid().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  items: z.array(PlaylistImportItemSchema),
})
export const PlaylistImportsSchema = z.array(PlaylistImportSchema)
export type PlaylistImport = z.infer<typeof PlaylistImportSchema>
export const PlaylistImportIdSchema = z.object({ id: z.uuid() }).strict()
export const PlaylistImportLinkSchema = z.object({ url: z.url() }).strict()
export const PlaylistMatchChoiceSchema = z.object({
  itemId: z.uuid(),
  youtubeUrl: z.url().nullable(),
}).strict()
export const PlaylistMatchSearchSchema = z.object({
  itemId: z.uuid(),
  query: z.string().trim().min(2).max(160),
}).strict()
