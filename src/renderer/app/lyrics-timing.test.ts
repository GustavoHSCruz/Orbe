import { describe, expect, it } from 'vitest'
import { parseLyrics, lyricClock, lyricSeekTime } from './lyrics-timing'
import { usePlayer } from '../stores/player'

const result = (syncedLyrics: string) => ({
  source: 'local' as const,
  trackName: 'Track',
  artistName: 'Artist',
  syncedLyrics,
  plainLyrics: null,
})

describe('lyrics timing', () => {
  it('delays the active verse without clamping the introduction to zero', () => {
    expect(lyricClock(0, 200)).toBe(-0.2)
    expect(lyricClock(10.199, 200)).toBeLessThan(10)
    expect(lyricClock(10.2, 200)).toBe(10)
    expect(lyricSeekTime(10, 200)).toBe(10.2)
    expect(lyricSeekTime(0, -500)).toBe(0)
  })
  it('honors LRC offsets and repeated timestamps in chronological order', () => {
    expect(
      parseLyrics(
        result('[offset:150]\n[00:12.50][00:02.50]Chorus\n[00:08.00]Verse'),
      ),
    ).toEqual([
      { time: 2.35, text: 'Chorus' },
      { time: 7.85, text: 'Verse' },
      { time: 12.35, text: 'Chorus' },
    ])
    expect(parseLyrics(result('[offset:-250]\n[00:01.00]Hello'))[0]?.time).toBe(
      1.25,
    )
  })
  it('keeps untimed lyrics untimed', () => {
    expect(parseLyrics({ ...result(''), plainLyrics: 'Hello\nWorld' })).toEqual(
      [
        { time: null, text: 'Hello' },
        { time: null, text: 'World' },
      ],
    )
  })
  it('persists independent adjustments for each track with finite limits', () => {
    usePlayer.getState().setLyricsDelay('a', 350)
    usePlayer.getState().setLyricsDelay('b', -100)
    usePlayer.getState().setLyricsDelay('a', NaN)
    expect(usePlayer.getState().lyricsDelayByTrack).toMatchObject({
      a: 350,
      b: -100,
    })
    const saved = JSON.parse(localStorage.getItem('orbe-player-v1')!)
    expect(saved.state.lyricsDelayByTrack).toMatchObject({ a: 350, b: -100 })
    usePlayer.getState().setLyricsDelay('a', 6000)
    expect(usePlayer.getState().lyricsDelayByTrack.a).toBe(5000)
  })
})
