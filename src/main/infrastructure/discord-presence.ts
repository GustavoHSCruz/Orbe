import { Client } from '@xhayper/discord-rpc'
import { ActivityType } from 'discord-api-types/v10'
import type {
  MediaPresence,
  PresenceProvider,
} from '../domain/presence-provider'

export class DiscordPresenceProvider implements PresenceProvider {
  private client: Client | null = null
  private connecting: Promise<void> | null = null
  constructor(private clientId: string) {}

  async setClientId(clientId: string): Promise<void> {
    if (clientId !== this.clientId) {
      await this.disconnect()
      this.clientId = clientId
    }
  }

  async connect(): Promise<void> {
    if (!this.clientId || this.client?.isConnected) return
    if (this.connecting) return this.connecting
    const client = new Client({ clientId: this.clientId })
    this.client = client
    this.connecting = client
      .login()
      .catch(async (error: unknown) => {
        if (this.client === client) this.client = null
        try {
          await client.destroy()
        } catch {
          // The socket may already be closed after a connection failure.
        }
        throw error
      })
      .finally(() => {
        this.connecting = null
      })
    return this.connecting
  }

  async disconnect(): Promise<void> {
    await this.connecting?.catch(() => undefined)
    if (this.client) await this.client.destroy()
    this.client = null
  }

  async setPresence({ track, preferences }: MediaPresence): Promise<void> {
    if (!this.clientId) return
    const user = this.client?.user
    if (!user) throw new Error('Discord is not connected')
    await user.setActivity({
      type: ActivityType.Listening,
      details: preferences.showTitle ? track.title : 'Listening to Orbe',
      state: !track.isPlaying
        ? `Paused · ${preferences.showArtist ? track.artist : 'Orbe'}`
        : preferences.showArtist
          ? track.artist
          : track.source === 'spotify'
            ? 'Spotify'
            : 'Orbe',
      ...(preferences.showArtwork && track.artwork
        ? { largeImageUrl: track.artwork }
        : {}),
      ...(preferences.showAlbum && track.album
        ? { largeImageText: track.album }
        : {}),
      ...(preferences.showPlaybackTime && track.isPlaying
        ? { startTimestamp: Date.now() - track.progressMs }
        : {}),
    })
  }

  async clear(): Promise<void> {
    if (this.client?.isConnected) await this.client.user?.clearActivity()
  }
}
