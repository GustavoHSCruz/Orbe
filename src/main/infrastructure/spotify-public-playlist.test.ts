// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { readSpotifyPublicPlaylist, readSpotifyPublicTrack, spotifyPlaylistId } from './spotify-public-playlist'

const playlistId = '2xvk0b8XlgBDK2P75cDB2K'
const trackId = (index: number) => String(index).padStart(22, '0')

afterEach(() => vi.unstubAllGlobals())

it('accepts only a Spotify playlist link', () => {
  expect(spotifyPlaylistId(`https://open.spotify.com/playlist/${playlistId}?si=abc`)).toBe(playlistId)
  expect(() => spotifyPlaylistId('https://example.com/playlist/' + playlistId)).toThrow()
  expect(() => spotifyPlaylistId('https://open.spotify.com/track/' + playlistId)).toThrow()
})

it('keeps the playlist incomplete when the embed exposes only 100 of 340 items', async () => {
  const tracks = Array.from({ length: 100 }, (_, index) => ({
    uri: `spotify:track:${trackId(index)}`,
    title: `Song ${index}`,
    subtitle: 'Artist',
    duration: 200000,
  }))
  const data = {
    props: { pageProps: { state: {
      data: { entity: { name: 'Rock', trackList: tracks } },
      settings: { session: { accessToken: 'anonymous' } },
    } } },
  }
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.includes('/embed/'))
      return new Response(`<script id="__NEXT_DATA__">${JSON.stringify(data)}</script>`)
    if (input.includes('spclient.wg.spotify.com')) return new Response('blocked', { status: 403 })
    return new Response('<meta property="og:description" content="Playlist · Rock · 340 items">')
  }))
  const result = await readSpotifyPublicPlaylist(`https://open.spotify.com/playlist/${playlistId}`)
  expect(result.expectedCount).toBe(340)
  expect(result.tracks).toHaveLength(100)
})

it('takes all 340 positions from the anonymous playlist response, including duplicates', async () => {
  const tracks = Array.from({ length: 100 }, (_, index) => ({
    uri: `spotify:track:${trackId(index)}`,
    title: `Song ${index}`,
    subtitle: 'Artist',
  }))
  const data = {
    props: { pageProps: { state: {
      data: { entity: { name: 'Rock', trackList: tracks } },
      settings: { session: { accessToken: 'anonymous' } },
    } } },
  }
  const items = Array.from({ length: 340 }, (_, index) => ({
    uri: `spotify:track:${trackId(index === 339 ? 2 : index)}`,
  }))
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.includes('/embed/'))
      return new Response(`<script id="__NEXT_DATA__">${JSON.stringify(data)}</script>`)
    if (input.includes('spclient.wg.spotify.com'))
      return Response.json({ length: 340, contents: { items } })
    return new Response('<meta property="og:description" content="Playlist · Rock · 340 items">')
  }))
  const result = await readSpotifyPublicPlaylist(`https://open.spotify.com/playlist/${playlistId}`)
  expect(result.tracks).toHaveLength(340)
  expect(result.tracks[0]?.title).toBe('Song 0')
  expect(result.tracks[100]?.title).toBeNull()
  expect(result.tracks[339]?.spotifyId).toBe(trackId(2))
})

it('does not accept a truncated internal count over the advertised page count', async () => {
  const data = {
    props: { pageProps: { state: {
      data: { entity: { name: 'Rock', trackList: Array.from({ length: 100 }, (_, index) => ({
        uri: `spotify:track:${trackId(index)}`, title: `Song ${index}`, subtitle: 'Artist',
      })) } },
      settings: { session: { accessToken: 'anonymous' } },
    } } },
  }
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.includes('/embed/'))
      return new Response(`<script id="__NEXT_DATA__">${JSON.stringify(data)}</script>`)
    if (input.includes('spclient.wg.spotify.com'))
      return Response.json({ length: 100, contents: { items: data.props.pageProps.state.data.entity.trackList } })
    return new Response('<meta property="og:description" content="Playlist · Rock · 340 items">')
  }))
  const result = await readSpotifyPublicPlaylist(`https://open.spotify.com/playlist/${playlistId}`)
  expect(result.expectedCount).toBe(340)
  expect(result.tracks).toHaveLength(100)
})

it.skipIf(process.env.ORBE_LIVE_SPOTIFY_TEST !== '1')(
  'reads the supplied 340-item public playlist end to end', async () => {
    const result = await readSpotifyPublicPlaylist(
      `https://open.spotify.com/playlist/${playlistId}?si=ac0da10f98b4474a`,
    )
    expect(result.name).toBe('Rock')
    expect(result.expectedCount).toBe(340)
    expect(result.tracks).toHaveLength(340)
    expect(result.tracks.every((track) => track.spotifyId.length === 22)).toBe(true)
    for (const position of [100, 339]) {
      const track = await readSpotifyPublicTrack(result.tracks[position]!.spotifyId)
      expect(track.title?.length).toBeGreaterThan(0)
      expect(track.artist?.length).toBeGreaterThan(0)
    }
  }, 90000,
)

it.skipIf(process.env.ORBE_LIVE_SPOTIFY_FULL_TEST !== '1')(
  'resolves metadata for every song in the supplied public playlist', async () => {
    const result = await readSpotifyPublicPlaylist(`https://open.spotify.com/playlist/${playlistId}`)
    expect(result.tracks).toHaveLength(340)
    const missing = result.tracks.filter((track) => !track.title || !track.artist)
    const resolved = []
    for (const track of missing) resolved.push(await readSpotifyPublicTrack(track.spotifyId))
    expect(resolved).toHaveLength(missing.length)
    expect(resolved.every((track) => track.title && track.artist)).toBe(true)
  }, 300000,
)
