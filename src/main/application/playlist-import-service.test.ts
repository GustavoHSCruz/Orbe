// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { openDatabase } from '../database/database'
import { LibraryService } from './library-service'
import { LocalPlaylistService } from './local-playlist-service'
import { PlaylistImportService } from './playlist-import-service'
import type { DownloadManager } from './download-manager'
import type { ProcessRunner } from '../domain/media-provider'
import type { YtDlpProvider } from '../infrastructure/media/yt-dlp-provider'
import type { Settings } from '../../shared/contracts/media'

vi.mock('../infrastructure/spotify-public-playlist', () => ({
  readSpotifyPublicPlaylist: async () => ({
    spotifyId: '2xvk0b8XlgBDK2P75cDB2K',
    url: 'https://open.spotify.com/playlist/2xvk0b8XlgBDK2P75cDB2K',
    name: 'Rock', expectedCount: 340,
    tracks: Array.from({ length: 100 }, (_, index) => ({
      spotifyId: String(index).padStart(22, '0'),
      title: `Song ${index}`, artist: 'Artist', durationMs: 180000,
    })),
  }),
  readSpotifyPublicTrack: async () => { throw new Error('unavailable') },
}))

let directory: string | null = null
afterEach(() => {
  if (directory) rmSync(directory, { recursive: true, force: true })
  directory = null
})

it('keeps partial drafts and rejects both batch download and a mismatched export', async () => {
  directory = mkdtempSync(join(tmpdir(), 'orbe-import-'))
  const connection = openDatabase(join(directory, 'orbe.sqlite'), resolve('drizzle'))
  const local = new LocalPlaylistService(connection.db, new LibraryService(connection.db))
  const manager = { list: () => [] } as unknown as DownloadManager
  const service = new PlaylistImportService(
    connection.db, manager, local,
    {} as ProcessRunner, '', {} as YtDlpProvider, () => ({} as Settings),
  )
  const draft = await service.createFromLink('https://open.spotify.com/playlist/2xvk0b8XlgBDK2P75cDB2K')
  expect(draft.items).toHaveLength(100)
  expect(draft.complete).toBe(false)
  expect(() => service.startDownloads(draft.id)).toThrow('incompleta')

  const exportPath = join(directory, 'Playlist1.json')
  writeFileSync(exportPath, JSON.stringify({ playlists: [{ name: 'Rock', items:
    Array.from({ length: 339 }, (_, index) => ({ track: {
      trackName: `Song ${index}`, artistName: 'Artist',
      trackUri: `spotify:track:${String(index).padStart(22, '0')}`,
    } })),
  }] }))
  await expect(service.importExport(draft.id, exportPath)).rejects.toThrow('anunciou 340')
  writeFileSync(exportPath, JSON.stringify({ playlists: [{ name: 'Rock', items:
    Array.from({ length: 340 }, (_, index) => ({ track: {
      trackName: `Song ${index}`, artistName: 'Artist',
      trackUri: `spotify:track:${String(index + 1).padStart(22, '0')}`,
    } })),
  }] }))
  await expect(service.importExport(draft.id, exportPath)).rejects.toThrow('ordem da exportação')
  expect(service.list()[0]?.complete).toBe(false)
  connection.sqlite.close()
})
