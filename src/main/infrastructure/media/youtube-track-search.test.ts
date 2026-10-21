import { expect, it } from 'vitest'
import { automaticYouTubeMatch, rankYouTubeCandidate } from './youtube-track-search'

const source = { title: 'ZOMBIFIED', artist: 'Falling In Reverse', durationMs: 218000 }

it('prefers a close artist, title and duration without a conflicting version', () => {
  const original = rankYouTubeCandidate(source, {
    id: 'abcdefghijk', url: 'https://www.youtube.com/watch?v=abcdefghijk',
    title: 'Falling In Reverse - ZOMBIFIED (Official Music Video)',
    channel: 'Falling In Reverse', durationMs: 220000,
  })
  const cover = rankYouTubeCandidate(source, {
    id: 'lmnopqrstuv', url: 'https://www.youtube.com/watch?v=lmnopqrstuv',
    title: 'ZOMBIFIED cover', channel: 'Falling In Reverse Covers', durationMs: 219000,
  })
  expect(original).toBeGreaterThanOrEqual(0.9)
  expect(cover).toBeLessThan(0.9)
})

it('requires a clear lead before automatically choosing a YouTube result', () => {
  const candidate = (score: number) => ({
    id: 'abcdefghijk', url: 'https://www.youtube.com/watch?v=abcdefghijk',
    title: 'ZOMBIFIED', channel: 'Falling In Reverse', durationMs: 218000, score,
  })
  expect(automaticYouTubeMatch([candidate(1), candidate(0.92)])).toBeNull()
  expect(automaticYouTubeMatch([candidate(0.89)])).toBeNull()
  expect(automaticYouTubeMatch([candidate(1), candidate(0.7)])?.score).toBe(1)
})
