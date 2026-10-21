import { z } from 'zod'
import { LibraryRecordSchema } from './media'

export const LocalPlaylistSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  items: z.array(LibraryRecordSchema.extend({ playlistItemId: z.uuid() })),
})
export type LocalPlaylist = z.infer<typeof LocalPlaylistSchema>
export const LocalPlaylistsSchema = z.array(LocalPlaylistSchema)
export const LocalPlaylistInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(''),
})
export const LocalPlaylistItemInputSchema = z.object({
  playlistId: z.uuid(),
  mediaId: z.uuid(),
})
export const LocalPlaylistEntryInputSchema = z.object({
  playlistId: z.uuid(),
  itemId: z.uuid(),
})
