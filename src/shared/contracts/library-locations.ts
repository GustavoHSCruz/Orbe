import { z } from 'zod'
import {
  DownloadStatusSchema,
  LibraryRecordSchema,
  SettingsSchema,
} from './media'

export const PreviousDirectoryActionSchema = z.enum(['keep', 'stop'])
export type PreviousDirectoryAction = z.infer<
  typeof PreviousDirectoryActionSchema
>
export const SaveSettingsRequestSchema = z.object({
  settings: SettingsSchema,
  previousDirectoryAction: PreviousDirectoryActionSchema.optional(),
})
export const LibraryLocationsSchema = z.object({
  directories: z.array(
    z.object({
      path: z.string(),
      isDownloadDirectory: z.boolean(),
      state: z.enum(['ready', 'missing', 'unreadable']),
    }),
  ),
  missing: z.array(
    z.object({
      item: LibraryRecordSchema,
      directory: z.string(),
      reason: z.enum(['missing', 'unreadable']),
      downloadId: z.string().nullable(),
      downloadStatus: DownloadStatusSchema.nullable(),
      canDownloadAgain: z.boolean(),
    }),
  ),
  scanning: z.boolean(),
  lastScanAt: z.number().nullable(),
  imported: z.number(),
  relinked: z.number(),
  errors: z.array(z.string()),
})
export type LibraryLocations = z.infer<typeof LibraryLocationsSchema>
