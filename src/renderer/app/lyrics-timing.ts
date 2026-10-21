import type { LyricsResult } from '../../shared/contracts/lyrics'

export type LyricLine = { time: number | null; text: string }
// A small, adjustable presentation delay for lyrics that precede the vocal.
export const DEFAULT_LYRICS_DELAY_MS = 200

export function parseLyrics(result: LyricsResult): LyricLine[] {
  if (!result) return []
  if (result.syncedLyrics) {
    const offset =
      Number(/\[offset:([+-]?\d+)\]/i.exec(result.syncedLyrics)?.[1] ?? 0) /
      1000
    const rows = result.syncedLyrics
      .split(/\r?\n/)
      .flatMap((line) => {
        const stamps = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]
        const text = line.replace(/\[[^\]]*\]/g, '').trim()
        return text
          ? stamps.map((stamp) => ({
              time: Number(stamp[1]) * 60 + Number(stamp[2]) - offset,
              text,
            }))
          : []
      })
      .sort((a, b) => a.time - b.time)
    if (rows.length) return rows
  }
  return (result.plainLyrics ?? '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((text) => ({ time: null, text }))
}

export function lyricClock(mediaTime: number, delayMs: number): number {
  return mediaTime - delayMs / 1000
}

export function lyricSeekTime(lineTime: number, delayMs: number): number {
  return Math.max(0, lineTime + delayMs / 1000)
}
