import { z } from 'zod'

export const ConversionFormatSchema = z.enum([
  'mp3',
  'm4a',
  'opus',
  'flac',
  'wav',
  'mp4',
  'webm',
])
export const ConversionSourceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  extension: z.string(),
  sizeBytes: z.number().nonnegative(),
  durationMs: z.number().nonnegative().nullable(),
  hasAudio: z.boolean(),
  hasVideo: z.boolean(),
})
export const OptionalConversionSourceSchema = ConversionSourceSchema.nullable()
export const ConversionRequestSchema = z.object({
  sourceId: z.uuid(),
  format: ConversionFormatSchema,
})
export const ConversionProgressSchema = z.object({
  percent: z.number().min(0).max(100),
})
export const ConversionResultSchema = z.object({
  name: z.string(),
  path: z.string(),
  format: ConversionFormatSchema,
})
export type ConversionFormat = z.infer<typeof ConversionFormatSchema>
export type ConversionSource = z.infer<typeof ConversionSourceSchema>
export type ConversionResult = z.infer<typeof ConversionResultSchema>
