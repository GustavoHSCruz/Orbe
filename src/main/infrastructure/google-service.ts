import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { safeStorage, shell } from 'electron'
import { z } from 'zod'
import {
  YouTubeItemSchema,
  YouTubeOverviewSchema,
  type YouTubeItem,
  type YouTubeOverview,
} from '../../shared/contracts/youtube'

const TokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
})
type Token = z.infer<typeof TokenSchema>
const PlaylistApiSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        thumbnails: z
          .record(z.string(), z.object({ url: z.string() }))
          .optional(),
      }),
      contentDetails: z.object({ itemCount: z.number() }).optional(),
    }),
  ),
  nextPageToken: z.string().optional(),
})
const PlaylistItemsApiSchema = z.object({
  items: z.array(
    z.object({
      snippet: z.object({
        title: z.string(),
        resourceId: z.object({ videoId: z.string().optional() }),
        thumbnails: z
          .record(z.string(), z.object({ url: z.string() }))
          .optional(),
      }),
    }),
  ),
  nextPageToken: z.string().optional(),
})

function thumbnail(
  raw: Record<string, { url: string }> | undefined,
): string | null {
  return raw?.high?.url ?? raw?.medium?.url ?? raw?.default?.url ?? null
}

export class GoogleService {
  private token: Token | null = null
  private refreshPromise: Promise<string> | null = null
  constructor(
    private readonly clientId: () => string,
    private readonly userData: string,
  ) {
    if (safeStorage.isEncryptionAvailable() && existsSync(this.tokenPath)) {
      try {
        this.token = TokenSchema.parse(
          JSON.parse(safeStorage.decryptString(readFileSync(this.tokenPath))),
        )
      } catch {
        this.token = null
      }
    }
  }
  private get tokenPath(): string {
    return join(this.userData, 'google-token.bin')
  }
  private store(token: Token): void {
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
      throw new Error('Configure o Google Client ID nas configurações.')
    const verifier = randomBytes(48).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const state = randomUUID()
    const { code, redirectUri } = await new Promise<{
      code: string
      redirectUri: string
    }>((resolve, reject) => {
      let finished = false
      let redirectUri = ''
      const server = createServer((request, response) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1')
        if (url.pathname !== '/callback') {
          response.writeHead(404).end()
          return
        }
        if (finished) {
          response.writeHead(409).end('Conexão já concluída.')
          return
        }
        finished = true
        clearTimeout(timer)
        server.close()
        if (url.searchParams.get('state') !== state) {
          response.writeHead(400).end('Resposta OAuth inválida.')
          reject(new Error('Resposta OAuth inválida.'))
          return
        }
        const value = url.searchParams.get('code')
        if (!value) {
          response.writeHead(400).end('Conexão cancelada.')
          reject(new Error('A conexão com Google foi cancelada.'))
          return
        }
        response
          .writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
          .end('YouTube conectado. Você pode voltar ao Orbe.')
        resolve({ code: value, redirectUri })
      })
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true
          server.close()
          reject(new Error('A conexão com Google expirou.'))
        }
      }, 180000)
      server.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          reject(new Error('Callback OAuth indisponível.'))
          return
        }
        redirectUri = `http://127.0.0.1:${address.port}/callback`
        const authorize = new URL(
          'https://accounts.google.com/o/oauth2/v2/auth',
        )
        authorize.search = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope:
            'openid profile email https://www.googleapis.com/auth/youtube.readonly',
          access_type: 'offline',
          prompt: 'consent',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state,
        }).toString()
        void shell.openExternal(authorize.href).catch((error: unknown) => {
          clearTimeout(timer)
          server.close()
          reject(error)
        })
      })
    })
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        code_verifier: verifier,
        redirect_uri: redirectUri,
      }),
    })
    if (!response.ok) throw new Error('O Google não autorizou a conexão.')
    const token = z
      .object({
        access_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.number(),
      })
      .parse(await response.json())
    this.store({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: Date.now() + token.expires_in * 1000,
    })
  }

  disconnect(): void {
    this.token = null
    if (existsSync(this.tokenPath)) writeFileSync(this.tokenPath, '')
  }

  private async accessToken(): Promise<string> {
    if (!this.token) throw new Error('YouTube não conectado.')
    if (this.token.expires_at > Date.now() + 60000)
      return this.token.access_token
    this.refreshPromise ??= this.refreshAccessToken().finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private async refreshAccessToken(): Promise<string> {
    const token = this.token
    if (!token) throw new Error('YouTube não conectado.')
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: this.clientId(),
      }),
    })
    if (!response.ok) {
      this.disconnect()
      throw new Error('A sessão do Google expirou. Conecte novamente.')
    }
    const result = z
      .object({
        access_token: z.string(),
        expires_in: z.number(),
        refresh_token: z.string().optional(),
      })
      .parse(await response.json())
    this.store({
      access_token: result.access_token,
      refresh_token: result.refresh_token ?? token.refresh_token,
      expires_at: Date.now() + result.expires_in * 1000,
    })
    return result.access_token
  }

  private async api(url: string): Promise<unknown> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${await this.accessToken()}` },
    })
    if (!response.ok)
      throw new Error(`Google API indisponível (${response.status}).`)
    return response.json()
  }

  async overview(): Promise<YouTubeOverview> {
    if (!this.token)
      return {
        connected: false,
        name: null,
        email: null,
        avatar: null,
        playlists: [],
      }
    const profileRaw = await this.api(
      'https://openidconnect.googleapis.com/v1/userinfo',
    )
    const profile = z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        picture: z.string().optional(),
      })
      .parse(profileRaw)
    const playlists: YouTubeOverview['playlists'] = []
    let pageToken = ''
    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlists')
      url.search = new URLSearchParams({
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      }).toString()
      const page = PlaylistApiSchema.parse(await this.api(url.href))
      playlists.push(
        ...page.items.map((item) => ({
          id: item.id,
          title: item.snippet.title,
          thumbnail: thumbnail(item.snippet.thumbnails),
          itemCount: item.contentDetails?.itemCount ?? 0,
        })),
      )
      pageToken = page.nextPageToken ?? ''
    } while (pageToken && playlists.length < 200)
    return YouTubeOverviewSchema.parse({
      connected: true,
      name: profile.name ?? null,
      email: profile.email ?? null,
      avatar: profile.picture ?? null,
      playlists,
    })
  }

  async playlistItems(id: string): Promise<YouTubeItem[]> {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Playlist inválida.')
    const items: YouTubeItem[] = []
    let pageToken = ''
    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
      url.search = new URLSearchParams({
        part: 'snippet',
        playlistId: id,
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      }).toString()
      const page = PlaylistItemsApiSchema.parse(await this.api(url.href))
      items.push(
        ...page.items.flatMap((entry) => {
          const videoId = entry.snippet.resourceId.videoId
          return videoId
            ? [
                {
                  id: videoId,
                  title: entry.snippet.title,
                  thumbnail: thumbnail(entry.snippet.thumbnails),
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                },
              ]
            : []
        }),
      )
      pageToken = page.nextPageToken ?? ''
    } while (pageToken && items.length < 200)
    return z.array(YouTubeItemSchema).parse(items)
  }
}
