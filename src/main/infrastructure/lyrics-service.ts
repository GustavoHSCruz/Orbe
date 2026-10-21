import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { z } from 'zod'
import type { LibraryRecord } from '../../shared/contracts/media'
import type {
  LyricsResult,
  LyricsCandidate,
} from '../../shared/contracts/lyrics'

const CandidateSchema = z.object({
  trackName: z.string(),
  artistName: z.string(),
  duration: z.number().nullable().optional(),
  instrumental: z.boolean().optional(),
  syncedLyrics: z.string().nullable().optional(),
  plainLyrics: z.string().nullable().optional(),
})

export function clean(value: string): string {
  return value
    .replace(/\.(mp3|m4a|flac|ogg|opus|wav|webm|mp4)$/i, '')
    .replace(/\s*\[[A-Za-z0-9_-]{11}\]\s*$/, '')
    .replace(/^\d{1,3}[.\s_-]+/, '')
    .replace(
      /[([][^)\]]*(official|video|audio|lyrics|visualizer|clipe)[^)\]]*[)\]]/gi,
      '',
    )
    .replace(
      /\s*[-–|]\s*(official\s*)?(music\s*)?(video|audio|lyrics|visualizer).*$/i,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function cleanArtist(value: string): string {
  const parts = value
    .replace(/\s+-\s+Topic$/i, '')
    .replace(/\bVEVO$/i, '')
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.find((part) => normalize(part) !== normalize(parts[0] ?? ''))
    ? parts.join(', ')
    : (parts[0] ?? '')
}

export function metadata(
  track: LibraryRecord,
): { title: string; artist: string } | null {
  let title = clean(track.title)
  let artist = cleanArtist(track.artist?.trim() ?? '')
  if (!artist && title.includes(' - ')) {
    const [left, ...right] = title.split(' - ')
    artist = left?.trim() ?? ''
    title = right.join(' - ').trim()
  }
  if (
    artist &&
    normalize(title.split(/\s[-–—]\s/)[0] ?? '') === normalize(artist)
  )
    title = title.replace(/^.*?\s[-–—]\s/, '').trim()
  return title ? { title, artist } : null
}

type Candidate = z.infer<typeof CandidateSchema>
async function fetchCandidates(
  params: Record<string, string>,
): Promise<Candidate[]> {
  const query = new URL('https://lrclib.net/api/search')
  for (const [key, value] of Object.entries(params))
    if (value) query.searchParams.set(key, value)
  try {
    const response = await fetch(query, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Orbe/0.2 (desktop media player)',
        Accept: 'application/json',
      },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const raw: unknown = await response.json()
    if (!Array.isArray(raw)) throw new Error('Invalid response')
    return raw.flatMap((entry) => {
      const parsed = CandidateSchema.safeParse(entry)
      return parsed.success ? [parsed.data] : []
    })
  } catch {
    throw new Error(
      'Não foi possível conectar ao serviço de letras. Confira sua conexão e tente novamente.',
    )
  }
}

function relevance(
  item: Candidate,
  title: string,
  artist: string,
  durationMs: number | null,
): number {
  const found = normalize(clean(item.trackName))
  const expected = normalize(title)
  const titleScore =
    found === expected
      ? 10
      : found.includes(expected) || expected.includes(found)
        ? 5
        : 0
  const actualArtist = normalize(cleanArtist(item.artistName))
  const expectedArtist = normalize(artist)
  const artistScore =
    expectedArtist &&
    (actualArtist.includes(expectedArtist) ||
      expectedArtist.includes(actualArtist))
      ? 6
      : 0
  const durationScore =
    durationMs && item.duration
      ? Math.abs(item.duration * 1000 - durationMs) < 6000
        ? 3
        : -2
      : 0
  return titleScore + artistScore + durationScore + (item.syncedLyrics ? 1 : 0)
}

export async function searchLyricsCandidates(
  title: string,
  artist: string,
  durationMs: number | null,
): Promise<LyricsCandidate[]> {
  let cleanTitle = clean(title)
  let cleanName = cleanArtist(artist)
  const parts = cleanTitle.split(/\s[-–—]\s/)
  if (
    parts.length > 1 &&
    (!cleanName || normalize(parts[0]!) === normalize(cleanName))
  ) {
    cleanName ||= parts[0]!.trim()
    cleanTitle = parts.slice(1).join(' - ').trim()
  }
  if (!cleanTitle) return []
  let candidates = await fetchCandidates({
    track_name: cleanTitle,
    artist_name: cleanName,
  })
  if (!candidates.some((item) => item.syncedLyrics || item.plainLyrics))
    candidates = await fetchCandidates({
      q: `${cleanName} ${cleanTitle}`.trim(),
    })
  if (
    !candidates.some((item) => item.syncedLyrics || item.plainLyrics) &&
    cleanName
  )
    candidates = await fetchCandidates({ track_name: cleanTitle })
  const seen = new Set<string>()
  return candidates
    .filter((item) => {
      if (!item.syncedLyrics?.trim() && !item.plainLyrics?.trim()) return false
      const key = `${item.trackName}|${item.artistName}|${item.duration}|${item.syncedLyrics ?? item.plainLyrics}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort(
      (a, b) =>
        relevance(b, cleanTitle, cleanName, durationMs) -
        relevance(a, cleanTitle, cleanName, durationMs),
    )
    .slice(0, 12)
    .map((item) => ({
      source: 'lrclib',
      trackName: item.trackName,
      artistName: item.artistName,
      duration: item.duration ?? null,
      syncedLyrics: item.syncedLyrics ?? null,
      plainLyrics: item.plainLyrics ?? null,
    }))
}

export async function searchLyrics(
  title: string,
  artist: string,
  durationMs: number | null,
): Promise<LyricsResult> {
  const candidates = await searchLyricsCandidates(title, artist, durationMs)
  const expectedTitle = normalize(clean(title))
  const expectedArtist = normalize(cleanArtist(artist))
  const matches = candidates.filter(
    (item) =>
      normalize(clean(item.trackName)) === expectedTitle &&
      (!expectedArtist ||
        normalize(cleanArtist(item.artistName)).includes(expectedArtist)),
  )
  // Automatic lookup stays conservative; the search panel lets the listener
  // choose among versions when metadata is incomplete or ambiguous.
  return (
    matches.find(
      (item) =>
        durationMs &&
        item.duration &&
        Math.abs(item.duration * 1000 - durationMs) <= 6000,
    ) ??
    (matches.length &&
    (expectedArtist ||
      new Set(matches.map((item) => normalize(item.artistName))).size === 1)
      ? matches[0]!
      : null)
  )
}

export async function lyricsForTrack(
  track: LibraryRecord,
): Promise<LyricsResult> {
  const localPath =
    track.filePath.slice(0, -extname(track.filePath).length) + '.lrc'
  try {
    const local = await readFile(localPath, 'utf8')
    if (local.length > 0 && local.length <= 200000)
      return {
        source: 'local',
        trackName: track.title,
        artistName: track.artist ?? '',
        syncedLyrics: local,
        plainLyrics: null,
      }
  } catch {
    /* A sidecar file is optional. */
  }
  const meta = metadata(track)
  if (!meta) return null
  return searchLyrics(meta.title, meta.artist, track.durationMs)
}
