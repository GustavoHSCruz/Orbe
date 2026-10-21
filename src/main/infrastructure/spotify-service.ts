import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { safeStorage, shell } from 'electron'
import { z } from 'zod'
import type { NowPlayingTrack } from '../../shared/contracts/media'
import {
  SpotifyOverviewSchema,
  type SpotifyOverview,
} from '../../shared/contracts/spotify'

const TokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
})
type Token = z.infer<typeof TokenSchema>
const ApiTrackSchema = z.object({
  name: z.string(),
  duration_ms: z.number(),
  artists: z.array(z.object({ name: z.string() })),
  album: z
    .object({
      name: z.string(),
      images: z.array(z.object({ url: z.string() })),
    })
    .optional(),
  external_urls: z.object({ spotify: z.string() }).optional(),
})

export function mapSpotifyTrack(
  raw: unknown,
  progressMs: number,
  isPlaying: boolean,
): NowPlayingTrack {
  const track = ApiTrackSchema.parse(raw)
  return {
    source: 'spotify',
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(', '),
    album: track.album?.name ?? null,
    artwork: track.album?.images[0]?.url ?? null,
    durationMs: track.duration_ms,
    progressMs,
    isPlaying,
    externalUrl: track.external_urls?.spotify ?? null,
  }
}

export class SpotifyService {
  private token: Token | null = null
  private nowPlaying: NowPlayingTrack | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private retryAfter = 0
  private refreshPromise: Promise<string> | null = null

  constructor(
    private readonly clientId: () => string,
    private readonly userData: string,
    private readonly onTrack: (track: NowPlayingTrack | null) => void,
    private readonly isBackground: () => boolean = () => false,
  ) {
    this.loadToken()
    if (this.token) this.schedule(1000)
  }

  private get tokenPath(): string {
    return join(this.userData, 'spotify-token.bin')
  }

  private loadToken(): void {
    if (!safeStorage.isEncryptionAvailable() || !existsSync(this.tokenPath))
      return
    try {
      this.token = TokenSchema.parse(
        JSON.parse(safeStorage.decryptString(readFileSync(this.tokenPath))),
      )
    } catch {
      this.token = null
    }
  }

  private storeToken(token: Token): void {
    this.token = token
    if (safeStorage.isEncryptionAvailable())
      writeFileSync(
        this.tokenPath,
        safeStorage.encryptString(JSON.stringify(token)),
      )
  }

  async connect(): Promise<void> {
    const clientId = this.clientId().trim()
    if (!clientId)
      throw new Error('Configure o Spotify Client ID nas configurações.')
    const verifier = randomBytes(48).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const state = randomUUID()
    const { code, redirectUri } = await this.waitForAuthorization(
      clientId,
      challenge,
      state,
    )
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      }),
    })
    if (!response.ok) throw new Error('O Spotify não autorizou a conexão.')
    const result = z
      .object({
        access_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.number(),
      })
      .parse(await response.json())
    this.storeToken({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_at: Date.now() + result.expires_in * 1000,
    })
    this.schedule(0)
  }

  private async waitForAuthorization(
    clientId: string,
    challenge: string,
    state: string,
  ): Promise<{ code: string; redirectUri: string }> {
    return new Promise((resolve, reject) => {
      let done = false
      const server = createServer((request, response) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1')
        if (url.pathname !== '/callback') {
          response.writeHead(404).end()
          return
        }
        if (done) {
          response.writeHead(409).end('Conexão já concluída.')
          return
        }
        done = true
        clearTimeout(timer)
        server.close()
        if (url.searchParams.get('state') !== state) {
          response.writeHead(400).end('Resposta OAuth inválida.')
          reject(new Error('Resposta OAuth inválida.'))
          return
        }
        const code = url.searchParams.get('code')
        if (!code) {
          response.writeHead(400).end('Conexão cancelada.')
          reject(new Error('A conexão com Spotify foi cancelada.'))
          return
        }
        response
          .writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
          .end('Spotify conectado. Você pode voltar ao Orbe.')
        resolve({ code, redirectUri })
      })
      const timer = setTimeout(() => {
        if (!done) {
          done = true
          server.close()
          reject(new Error('A conexão com Spotify expirou.'))
        }
      }, 180000)
      let redirectUri = ''
      server.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          reject(new Error('Não foi possível abrir o callback OAuth.'))
          return
        }
        redirectUri = `http://127.0.0.1:${address.port}/callback`
        const authorize = new URL('https://accounts.spotify.com/authorize')
        authorize.search = new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope:
            'user-read-currently-playing user-read-recently-played playlist-read-private playlist-read-collaborative',
          code_challenge_method: 'S256',
          code_challenge: challenge,
          state,
        }).toString()
        void shell.openExternal(authorize.href).catch((error: unknown) => {
          clearTimeout(timer)
          server.close()
          reject(error)
        })
      })
    })
  }

  disconnect(): void {
    if (this.timer) clearTimeout(this.timer)
    this.token = null
    this.nowPlaying = null
    this.onTrack(null)
    if (existsSync(this.tokenPath)) writeFileSync(this.tokenPath, '')
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer)
  }

  private async accessToken(): Promise<string> {
    if (!this.token) throw new Error('Spotify não conectado.')
    if (this.token.expires_at > Date.now() + 60000)
      return this.token.access_token
    this.refreshPromise ??= this.refreshAccessToken().finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private async refreshAccessToken(): Promise<string> {
    const token = this.token
    if (!token) throw new Error('Spotify não conectado.')
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: this.clientId(),
      }),
    })
    if (!response.ok) {
      if (response.status === 400) this.disconnect()
      throw new Error('A sessão do Spotify expirou. Conecte novamente.')
    }
    const result = z
      .object({
        access_token: z.string(),
        refresh_token: z.string().optional(),
        expires_in: z.number(),
      })
      .parse(await response.json())
    this.storeToken({
      access_token: result.access_token,
      refresh_token: result.refresh_token ?? token.refresh_token,
      expires_at: Date.now() + result.expires_in * 1000,
    })
    return result.access_token
  }

  private async api(path: string): Promise<unknown> {
    const response = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${await this.accessToken()}` },
    })
    if (response.status === 204) return null
    if (response.status === 429) {
      this.retryAfter =
        Date.now() + Number(response.headers.get('Retry-After') ?? '30') * 1000
      throw new Error('Limite do Spotify atingido. Aguarde alguns segundos.')
    }
    if (!response.ok)
      throw new Error(`Spotify indisponível (${response.status}).`)
    return response.json()
  }

  private schedule(delay: number): void {
    if (this.timer) clearTimeout(this.timer)
    if (!this.token) return
    this.timer = setTimeout(() => {
      void this.poll()
    }, delay)
  }

  private async poll(): Promise<void> {
    try {
      if (Date.now() < this.retryAfter) {
        this.schedule(this.retryAfter - Date.now())
        return
      }
      const raw = await this.api('/me/player/currently-playing')
      const parsed = z
        .object({
          is_playing: z.boolean(),
          progress_ms: z.number().nullable(),
          item: z.unknown().nullable(),
        })
        .nullable()
        .parse(raw)
      this.nowPlaying = parsed?.item
        ? mapSpotifyTrack(
            parsed.item,
            parsed.progress_ms ?? 0,
            parsed.is_playing,
          )
        : null
      this.onTrack(this.nowPlaying)
      this.schedule(
        this.isBackground()
          ? this.nowPlaying?.isPlaying
            ? 30000
            : 60000
          : this.nowPlaying?.isPlaying
            ? 5000
            : 15000,
      )
    } catch {
      this.schedule(Math.max(30000, this.retryAfter - Date.now()))
    }
  }

  async overview(): Promise<SpotifyOverview> {
    if (!this.token)
      return SpotifyOverviewSchema.parse({
        connected: false,
        profile: null,
        nowPlaying: null,
        recentlyPlayed: [],
        playlists: [],
      })
    const [profileRaw, recentRaw, playlistsRaw] = await Promise.all([
      this.api('/me'),
      this.api('/me/player/recently-played?limit=10'),
      this.api('/me/playlists?limit=20'),
    ])
    const profile = z
      .object({
        display_name: z.string().nullable(),
        images: z.array(z.object({ url: z.string() })).optional(),
      })
      .parse(profileRaw)
    const recent = z
      .object({ items: z.array(z.object({ track: ApiTrackSchema })) })
      .parse(recentRaw)
    const playlists = z
      .object({
        items: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            images: z.array(z.object({ url: z.string() })),
            items: z.object({ total: z.number() }).optional(),
            external_urls: z.object({ spotify: z.string() }).optional(),
          }),
        ),
      })
      .parse(playlistsRaw)
    return SpotifyOverviewSchema.parse({
      connected: true,
      profile: {
        name: profile.display_name ?? 'Spotify',
        avatar: profile.images?.[0]?.url ?? null,
      },
      nowPlaying: this.nowPlaying,
      recentlyPlayed: recent.items.map(({ track }) => ({
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(', '),
        url: track.external_urls?.spotify ?? null,
      })),
      playlists: playlists.items.map((item) => ({
        id: item.id,
        name: item.name,
        image: item.images[0]?.url ?? null,
        total: item.items?.total ?? 0,
        url: item.external_urls?.spotify ?? null,
      })),
    })
  }

  async playlistItems(
    id: string,
  ): Promise<{ title: string; artist: string; url: string | null }[]> {
    if (!/^[A-Za-z0-9]+$/.test(id)) throw new Error('Playlist inválida.')
    const raw = await this.api(`/playlists/${id}/items?limit=50`)
    const result = z
      .object({
        items: z.array(
          z.object({
            item: ApiTrackSchema.nullable().optional(),
            track: ApiTrackSchema.nullable().optional(),
          }),
        ),
      })
      .parse(raw)
    return result.items.flatMap((entry) => {
      const track = entry.item ?? entry.track
      return track
        ? [
            {
              title: track.name,
              artist: track.artists.map((artist) => artist.name).join(', '),
              url: track.external_urls?.spotify ?? null,
            },
          ]
        : []
    })
  }
}
