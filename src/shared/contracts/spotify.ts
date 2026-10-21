import { z } from 'zod'
import { OptionalNowPlayingTrackSchema } from './media'

export const SpotifyProfileSchema = z.object({
  name: z.string(),
  avatar: z.string().nullable(),
})
export const SpotifyPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  total: z.number(),
  url: z.string().nullable(),
})
export const SpotifyRecentSchema = z.object({
  title: z.string(),
  artist: z.string(),
  url: z.string().nullable(),
})
export const SpotifyOverviewSchema = z.object({
  connected: z.boolean(),
  profile: SpotifyProfileSchema.nullable(),
  nowPlaying: OptionalNowPlayingTrackSchema,
  recentlyPlayed: z.array(SpotifyRecentSchema),
  playlists: z.array(SpotifyPlaylistSchema),
})
export type SpotifyOverview = z.infer<typeof SpotifyOverviewSchema>
export const SpotifyPlaylistItemsSchema = z.array(SpotifyRecentSchema)
