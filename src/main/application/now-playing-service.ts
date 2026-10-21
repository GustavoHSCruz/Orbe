import type { NowPlayingTrack, Settings } from '../../shared/contracts/media'
import type { PresenceProvider } from '../domain/presence-provider'

export class NowPlayingService {
  private orbe: NowPlayingTrack | null = null
  private spotify: NowPlayingTrack | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private lastKey = ''
  private disposed = false

  constructor(
    private readonly presence: PresenceProvider,
    private readonly getSettings: () => Settings['discord'],
  ) {}

  update(track: NowPlayingTrack | null, source: 'orbe' | 'spotify'): void {
    if (source === 'orbe') this.orbe = track
    else this.spotify = track
    this.schedule()
  }

  get(): NowPlayingTrack | null {
    const mode = this.getSettings().source
    if (mode === 'orbe') return this.orbe
    if (mode === 'spotify') return this.spotify
    return this.orbe?.isPlaying
      ? this.orbe
      : this.spotify?.isPlaying
        ? this.spotify
        : (this.orbe ?? this.spotify)
  }

  settingsChanged(): void {
    this.lastKey = ''
    this.schedule()
  }

  private schedule(): void {
    if (this.disposed) return
    if (this.timer) clearTimeout(this.timer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, 1000)
  }

  private async flush(): Promise<void> {
    const preferences = this.getSettings()
    const track = this.get()
    const progressBucket = track ? Math.floor(track.progressMs / 10000) : 0
    const key = JSON.stringify({
      enabled: preferences.enabled,
      track: track ? { ...track, progressMs: progressBucket } : null,
      preferences,
    })
    if (key === this.lastKey) return
    this.lastKey = key
    try {
      if (
        !preferences.enabled ||
        !track ||
        (!track.isPlaying && preferences.paused === 'clear') ||
        (preferences.priority === 'spotify-native' &&
          track.source === 'spotify')
      ) {
        await this.presence.clear()
        return
      }
      await this.presence.connect()
      await this.presence.setPresence({ track, preferences })
    } catch (error) {
      // External integrations are optional and cannot interrupt playback.
      console.warn(
        'Discord presence unavailable:',
        error instanceof Error ? error.message : 'unknown error',
      )
      this.lastKey = ''
      if (!this.disposed && preferences.enabled && track) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null
          void this.flush()
        }, 15000)
      }
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    await this.presence.disconnect()
  }
}
