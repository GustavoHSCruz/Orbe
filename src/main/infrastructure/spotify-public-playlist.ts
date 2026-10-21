import { z } from 'zod'

const spotifyId = /^[A-Za-z0-9]{22}$/
const TrackSchema = z.object({
  uri: z.string(),
  title: z.string().optional(),
  name: z.string().optional(),
  subtitle: z.string().optional(),
  artists: z
    .union([
      z.object({ name: z.string() }),
      z.array(z.object({ name: z.string() })),
    ])
    .optional(),
  duration: z.number().optional(),
})

export type SpotifySourceTrack = {
  spotifyId: string
  title: string | null
  artist: string | null
  durationMs: number | null
}

export type SpotifySourcePlaylist = {
  spotifyId: string
  url: string
  name: string
  expectedCount: number | null
  tracks: SpotifySourceTrack[]
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function at(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((current, key) => object(current)?.[key], value)
}

function entityFromHtml(html: string): { entity: Record<string, unknown>; token: string | null } {
  const match = /<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/.exec(html)
  if (!match) throw new Error('O Spotify mudou a página pública da playlist.')
  const data: unknown = JSON.parse(match[1]!)
  const entity = object(at(data, 'props', 'pageProps', 'state', 'data', 'entity'))
  if (!entity) throw new Error('Não foi possível ler os dados públicos do Spotify.')
  const token = at(data, 'props', 'pageProps', 'state', 'settings', 'session', 'accessToken')
  return { entity, token: typeof token === 'string' ? token : null }
}

function sourceTrack(raw: unknown): SpotifySourceTrack | null {
  const parsed = TrackSchema.safeParse(raw)
  if (!parsed.success) return null
  const id = parsed.data.uri.split(':').at(-1)
  if (!id || !spotifyId.test(id) || !parsed.data.uri.startsWith('spotify:track:'))
    return null
  const artists = parsed.data.artists
  const artist =
    parsed.data.subtitle ||
    (Array.isArray(artists)
      ? artists.map((item) => item.name).join(', ')
      : artists?.name) ||
    null
  return {
    spotifyId: id,
    title: parsed.data.title ?? parsed.data.name ?? null,
    artist,
    durationMs: parsed.data.duration ?? null,
  }
}

async function readText(url: string, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, {
    ...(headers ? { headers } : {}), signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`O Spotify respondeu ${response.status}.`)
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > 8 * 1024 * 1024) throw new Error('A resposta do Spotify excede o limite permitido.')
  const text = await response.text()
  if (text.length > 8 * 1024 * 1024) throw new Error('A resposta do Spotify excede o limite permitido.')
  return text
}

export function spotifyPlaylistId(input: string): string {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('Cole um link de playlist do Spotify.')
  }
  const match = /^\/playlist\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname)
  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || !match)
    throw new Error('Cole um link público de playlist do Spotify.')
  return match[1]!
}

export async function readSpotifyPublicPlaylist(input: string): Promise<SpotifySourcePlaylist> {
  const id = spotifyPlaylistId(input)
  const url = `https://open.spotify.com/playlist/${id}`
  const [page, embed] = await Promise.all([
    readText(url).catch(() => ''),
    readText(`https://open.spotify.com/embed/playlist/${id}`),
  ])
  const { entity, token } = entityFromHtml(embed)
  const name = typeof entity.name === 'string' ? entity.name : 'Playlist do Spotify'
  const preview = Array.isArray(entity.trackList)
    ? entity.trackList.map(sourceTrack)
    : []
  const previewById = new Map(preview.flatMap((track) => (track ? [[track.spotifyId, track] as const] : [])))
  const countMatch = /(?:Playlist[^"<]*?[·•]\s*)?(\d[\d.,]*)\s+(?:items|songs|músicas|faixas)/i.exec(page)
  const pageCount = countMatch ? Number(countMatch[1]!.replace(/[.,]/g, '')) : null
  let expectedCount = Number.isSafeInteger(pageCount) ? pageCount : null
  let tracks = preview.filter((track): track is SpotifySourceTrack => track !== null)

  if (token) {
    try {
      const response = JSON.parse(
        await readText(
          `https://spclient.wg.spotify.com/playlist/v2/playlist/${id}`,
          { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        ),
      ) as unknown
      const count = at(response, 'length')
      const items = at(response, 'contents', 'items')
      if (typeof count === 'number' && Number.isSafeInteger(count))
        expectedCount = Math.max(expectedCount ?? 0, count)
      if (Array.isArray(items) && items.length >= tracks.length) {
        tracks = items.map((item) => {
          const uri = object(item)?.uri
          if (typeof uri !== 'string') return null
          const match = /^spotify:track:([A-Za-z0-9]{22})$/.exec(uri)
          if (!match) return null
          return previewById.get(match[1]!) ?? {
            spotifyId: match[1]!, title: null, artist: null, durationMs: null,
          }
        }).filter((track): track is SpotifySourceTrack => track !== null)
      }
    } catch {
      // The public embed remains a useful partial draft when the internal API changes.
    }
  }
  return { spotifyId: id, url, name, expectedCount, tracks }
}

export async function readSpotifyPublicTrack(id: string): Promise<SpotifySourceTrack> {
  if (!spotifyId.test(id)) throw new Error('Identificador de música inválido.')
  const html = await readText(`https://open.spotify.com/embed/track/${id}`)
  const track = sourceTrack(entityFromHtml(html).entity)
  if (!track || !track.title || !track.artist)
    throw new Error('Não foi possível ler os dados desta música.')
  return track
}
