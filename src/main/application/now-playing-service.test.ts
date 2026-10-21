import { describe, expect, it, vi } from 'vitest'
import type { PresenceProvider } from '../domain/presence-provider'
import type { NowPlayingTrack, Settings } from '../../shared/contracts/media'
import { NowPlayingService } from './now-playing-service'

const local: NowPlayingTrack = {
  source: 'orbe',
  title: 'Local',
  artist: 'Artist',
  album: null,
  artwork: null,
  durationMs: 100000,
  progressMs: 2000,
  isPlaying: true,
  externalUrl: null,
}
const spotify: NowPlayingTrack = {
  ...local,
  source: 'spotify',
  title: 'Spotify',
}

describe('NowPlayingService', () => {
  it('prefers the local player when both sources are playing', async () => {
    vi.useFakeTimers()
    const setPresence = vi.fn().mockResolvedValue(undefined)
    const provider: PresenceProvider = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      setPresence,
      clear: vi.fn().mockResolvedValue(undefined),
    }
    const preferences: Settings['discord'] = {
      enabled: true,
      showTitle: true,
      showArtist: true,
      showAlbum: false,
      showArtwork: false,
      showPlaybackTime: true,
      source: 'automatic',
      paused: 'clear',
      priority: 'automatic',
    }
    const service = new NowPlayingService(provider, () => preferences)
    service.update(spotify, 'spotify')
    service.update(local, 'orbe')
    await vi.runAllTimersAsync()
    expect(setPresence.mock.calls[0]?.[0]?.track.title).toBe('Local')
    await service.dispose()
    vi.useRealTimers()
  })

  it('reconnects when Discord becomes available after a connection failure', async () => {
    vi.useFakeTimers()
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error('Discord closed'))
      .mockResolvedValue(undefined)
    const setPresence = vi.fn().mockResolvedValue(undefined)
    const provider: PresenceProvider = {
      connect,
      disconnect: vi.fn().mockResolvedValue(undefined),
      setPresence,
      clear: vi.fn().mockResolvedValue(undefined),
    }
    const preferences: Settings['discord'] = {
      enabled: true,
      showTitle: true,
      showArtist: true,
      showAlbum: false,
      showArtwork: false,
      showPlaybackTime: true,
      source: 'automatic',
      paused: 'clear',
      priority: 'automatic',
    }
    const service = new NowPlayingService(provider, () => preferences)
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    try {
      service.update(local, 'orbe')
      await vi.advanceTimersByTimeAsync(1000)
      expect(connect).toHaveBeenCalledTimes(1)
      expect(setPresence).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(15000)
      expect(connect).toHaveBeenCalledTimes(2)
      expect(setPresence).toHaveBeenCalledTimes(1)
    } finally {
      await service.dispose()
      warning.mockRestore()
      vi.useRealTimers()
    }
  })
})
