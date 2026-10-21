import type { NowPlayingTrack, Settings } from '../../shared/contracts/media'

export interface MediaPresence {
  track: NowPlayingTrack
  preferences: Settings['discord']
}

export interface PresenceProvider {
  connect(): Promise<void>
  disconnect(): Promise<void>
  setPresence(presence: MediaPresence): Promise<void>
  clear(): Promise<void>
}
