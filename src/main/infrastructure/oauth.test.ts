// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { get } from 'node:http'

const { openExternal } = vi.hoisted(() => ({
  openExternal: vi.fn<(authorizeUrl: string) => Promise<void>>(),
}))

beforeEach(() => {
  openExternal.mockImplementation(async (authorizeUrl: string) => {
    const authorization = new URL(authorizeUrl)
    const redirect = authorization.searchParams.get('redirect_uri')
    const state = authorization.searchParams.get('state')
    if (!redirect || !state) throw new Error('OAuth parameters missing')
    const callback = new URL(redirect)
    callback.search = new URLSearchParams({
      code: 'test-code',
      state,
    }).toString()
    await new Promise<void>((resolve, reject) => {
      get(callback, (response) => {
        response.resume()
        response.on('end', resolve)
      }).on('error', reject)
    })
  })
})

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
    decryptString: (value: Buffer) =>
      value.toString().slice('encrypted:'.length),
  },
  shell: { openExternal },
}))

import { SpotifyService } from './spotify-service'
import { GoogleService } from './google-service'

const folders: string[] = []
afterEach(() => {
  vi.unstubAllGlobals()
  openExternal.mockClear()
  for (const folder of folders.splice(0))
    rmSync(folder, { recursive: true, force: true })
})

describe('desktop OAuth PKCE', () => {
  it('connects Spotify through a loopback callback and stores an encrypted token', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'orbe-spotify-oauth-'))
    folders.push(folder)
    const fetchMock = vi.fn<
      (url: string, options?: RequestInit) => Promise<Response>
    >(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'access',
            refresh_token: 'refresh',
            expires_in: 3600,
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const service = new SpotifyService(
      () => 'spotify-client',
      folder,
      () => undefined,
    )
    await service.connect()
    expect(openExternal).toHaveBeenCalledWith(
      expect.stringContaining('accounts.spotify.com/authorize'),
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://accounts.spotify.com/api/token',
    )
    expect(readFileSync(join(folder, 'spotify-token.bin'), 'utf8')).toContain(
      'encrypted:',
    )
    service.dispose()
  })

  it('connects Google with the readonly YouTube scope', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'orbe-google-oauth-'))
    folders.push(folder)
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'access',
            refresh_token: 'refresh',
            expires_in: 3600,
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const service = new GoogleService(() => 'google-client', folder)
    await service.connect()
    const authorization = new URL(String(openExternal.mock.calls[0]?.[0]))
    expect(authorization.searchParams.get('scope')).toContain(
      'youtube.readonly',
    )
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256')
    expect(readFileSync(join(folder, 'google-token.bin'), 'utf8')).toContain(
      'encrypted:',
    )
  })

  it('rejects a callback with the wrong OAuth state', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'orbe-invalid-oauth-'))
    folders.push(folder)
    openExternal.mockImplementationOnce(async (authorizeUrl: string) => {
      const authorization = new URL(authorizeUrl)
      const callback = new URL(
        authorization.searchParams.get('redirect_uri') ?? '',
      )
      callback.search = new URLSearchParams({
        code: 'spoofed',
        state: 'wrong',
      }).toString()
      const status = await new Promise<number>((resolve, reject) => {
        get(callback, (response) => {
          response.resume()
          response.on('end', () => resolve(response.statusCode ?? 0))
        }).on('error', reject)
      })
      expect(status).toBe(400)
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const service = new SpotifyService(
      () => 'spotify-client',
      folder,
      () => undefined,
    )
    await expect(service.connect()).rejects.toThrow('Resposta OAuth inválida.')
    expect(fetchMock).not.toHaveBeenCalled()
    service.dispose()
  })

  it('refreshes an expired Spotify token before loading the account', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'orbe-spotify-refresh-'))
    folders.push(folder)
    writeFileSync(
      join(folder, 'spotify-token.bin'),
      `encrypted:${JSON.stringify({
        access_token: 'expired',
        refresh_token: 'old-refresh',
        expires_at: 0,
      })}`,
    )
    const fetchMock = vi.fn<
      (url: string, options?: RequestInit) => Promise<Response>
    >(async (url) => {
      if (url.endsWith('/api/token'))
        return new Response(
          JSON.stringify({
            access_token: 'fresh',
            refresh_token: 'new-refresh',
            expires_in: 3600,
          }),
          { status: 200 },
        )
      if (url.endsWith('/me'))
        return new Response(
          JSON.stringify({ display_name: 'Listener', images: [] }),
          { status: 200 },
        )
      return new Response(JSON.stringify({ items: [] }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const service = new SpotifyService(
      () => 'spotify-client',
      folder,
      () => undefined,
    )
    try {
      expect((await service.overview()).profile?.name).toBe('Listener')
      expect(
        fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/token')),
      ).toHaveLength(1)
      expect(readFileSync(join(folder, 'spotify-token.bin'), 'utf8')).toContain(
        'new-refresh',
      )
    } finally {
      service.dispose()
    }
  })
})
