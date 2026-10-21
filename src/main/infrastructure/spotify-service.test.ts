import { describe, expect, it } from 'vitest'
import { mapSpotifyTrack } from './spotify-service'

describe('Spotify metadata mapping', () => {
  it('maps a playing track without exposing credentials', () => {
    const track = mapSpotifyTrack(
      {
        name: 'Example',
        duration_ms: 200000,
        artists: [{ name: 'Artist' }],
        album: {
          name: 'Album',
          images: [{ url: 'https://example.com/cover' }],
        },
      },
      30000,
      true,
    )
    expect(track).toMatchObject({
      source: 'spotify',
      title: 'Example',
      artist: 'Artist',
      durationMs: 200000,
      progressMs: 30000,
      isPlaying: true,
    })
  })
})
