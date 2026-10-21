// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clean, searchLyrics, searchLyricsCandidates } from './lyrics-service'

const candidate = {
  trackName: 'Ocean',
  artistName: 'Artist',
  duration: 180,
  syncedLyrics: '[00:01]Hello',
  plainLyrics: 'Hello',
}
afterEach(() => vi.unstubAllGlobals())
describe('lyrics search', () => {
  it('removes download suffixes and music-video labels', () => {
    expect(clean('01. Ocean (Official Video) [AbCdEfGh123].mp3')).toBe('Ocean')
  })
  it('finds a unique title even when imported metadata has no artist or duration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [candidate] }),
    )
    expect(await searchLyrics('Ocean', '', null)).toMatchObject({
      trackName: 'Ocean',
    })
  })
  it('falls back to a broad query, ranks synchronized versions and exposes choices', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ ...candidate, syncedLyrics: null }, candidate],
      })
    vi.stubGlobal('fetch', fetch)
    const result = await searchLyricsCandidates(
      'Artist - Ocean (Official Video)',
      '',
      180000,
    )
    expect(result).toHaveLength(2)
    expect(result[0]?.syncedLyrics).toBeTruthy()
    expect(String(fetch.mock.calls[0]?.[0])).toContain('track_name=Ocean')
    expect(String(fetch.mock.calls[1]?.[0])).toContain('q=Artist+Ocean')
  })
  it('reports a service failure instead of hiding it as missing lyrics', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(searchLyrics('Ocean', '', null)).rejects.toThrow('conectar')
  })
  it('does not auto-select the wrong artist for ambiguous titles', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => [
            candidate,
            { ...candidate, artistName: 'Someone else' },
          ],
        }),
    )
    expect(await searchLyrics('Ocean', '', null)).toBeNull()
    expect(await searchLyricsCandidates('Ocean', '', null)).toHaveLength(2)
  })
})
