import { z } from 'zod'

export const LyricsRequestSchema = z.object({ id: z.uuid() }).strict()
export const LyricsSearchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    artist: z.string().trim().max(200),
    durationMs: z.number().nonnegative().nullable(),
  })
  .strict()
export const LyricsResultSchema = z
  .object({
    source: z.enum(['local', 'lrclib']),
    trackName: z.string(),
    artistName: z.string(),
    syncedLyrics: z.string().nullable(),
    plainLyrics: z.string().nullable(),
  })
  .nullable()
export type LyricsResult = z.infer<typeof LyricsResultSchema>
export const LyricsCandidateSchema = LyricsResultSchema.unwrap().extend({
  duration: z.number().nullable(),
})
export const LyricsCandidatesSchema = z.array(LyricsCandidateSchema)
export type LyricsCandidate = z.infer<typeof LyricsCandidateSchema>
