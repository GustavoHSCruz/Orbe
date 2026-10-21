import { z } from 'zod'

export const YouTubePlaylistSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string().nullable(),
  itemCount: z.number(),
})
export const YouTubeItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string().nullable(),
  url: z.url(),
})
export const YouTubeOverviewSchema = z.object({
  connected: z.boolean(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
  playlists: z.array(YouTubePlaylistSchema),
})
export type YouTubeOverview = z.infer<typeof YouTubeOverviewSchema>
export type YouTubeItem = z.infer<typeof YouTubeItemSchema>
