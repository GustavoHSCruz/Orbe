import { z } from 'zod'
import type { ProcessRunner } from '../../domain/media-provider'
import type { YouTubeCandidate } from '../../../shared/contracts/playlist-import'

const SearchResultSchema = z.object({
  entries: z.array(z.object({
    id: z.string(),
    title: z.string(),
    duration: z.number().nullable().optional(),
    channel: z.string().nullable().optional(),
    uploader: z.string().nullable().optional(),
  }).passthrough()).default([]),
})

function normalize(input: string): string {
  return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\b(official|music|video|audio|lyrics|lyric|visualizer|hd|hq)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

const versions = ['live', 'remix', 'cover', 'karaoke', 'instrumental', 'acoustic', 'sped up', 'slowed', 'reimagined', 'revamped']

export function rankYouTubeCandidate(
  source: { title: string; artist: string; durationMs: number | null },
  candidate: Omit<YouTubeCandidate, 'score'>,
): number {
  const title = normalize(source.title)
  const artist = normalize(source.artist.split(',')[0] ?? source.artist)
  const result = normalize(candidate.title)
  const channel = normalize(candidate.channel ?? '')
  if (!title || !result) return 0
  const titleMatch = result.includes(title)
    ? 1
    : title.split(' ').filter((word) => result.split(' ').includes(word)).length /
      Math.max(1, title.split(' ').length)
  const artistMatch = result.includes(artist) || channel.includes(artist)
  let score = titleMatch * 0.62 + (artistMatch ? 0.24 : 0)
  for (const version of versions) {
    if (result.includes(version) !== title.includes(version)) score -= 0.34
  }
  if (source.durationMs && candidate.durationMs) {
    const difference = Math.abs(source.durationMs - candidate.durationMs) / 1000
    score += difference <= 5 ? 0.14 : difference <= 12 ? 0.08 : difference > 35 ? -0.25 : 0
  } else {
    score += 0.04
  }
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100))
}

export function automaticYouTubeMatch(candidates: YouTubeCandidate[]): YouTubeCandidate | null {
  const [first, second] = candidates
  return first && first.score >= 0.9 && first.score - (second?.score ?? 0) >= 0.12
    ? first : null
}

export async function searchYouTubeTrack(
  runner: ProcessRunner,
  executable: string,
  source: { title: string; artist: string; durationMs: number | null },
  cookies: { file: string; browser: string },
  query = `${source.artist} ${source.title}`,
): Promise<YouTubeCandidate[]> {
  const args = [
    '--dump-single-json', '--flat-playlist', '--no-warnings',
    ...(cookies.file ? ['--cookies', cookies.file] : cookies.browser !== 'none'
      ? ['--cookies-from-browser', cookies.browser] : []),
    '--', `ytsearch5:${query}`,
  ]
  const { stdout } = await runner.run(executable, args, { timeoutMs: 45000 })
  const results = SearchResultSchema.parse(JSON.parse(stdout) as unknown)
  return results.entries.flatMap((entry) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(entry.id)) return []
    const candidate = {
      id: entry.id,
      url: `https://www.youtube.com/watch?v=${entry.id}`,
      title: entry.title,
      channel: entry.channel ?? entry.uploader ?? null,
      durationMs: entry.duration == null ? null : entry.duration * 1000,
    }
    return [{ ...candidate, score: rankYouTubeCandidate(source, candidate) }]
  }).sort((a, b) => b.score - a.score)
}
