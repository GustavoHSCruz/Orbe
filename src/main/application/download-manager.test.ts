// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { MediaProvider, DownloadEvents } from '../domain/media-provider'
import { openDatabase } from '../database/database'
import { mediaLibrary } from '../database/schema'
import { MediaProviderRegistry } from '../infrastructure/media/provider-registry'
import { DownloadManager } from './download-manager'
import { LibraryService } from './library-service'
import { LocalPlaylistService } from './local-playlist-service'
import type {
  DownloadStartRequest,
  MediaAnalysis,
} from '../../shared/contracts/media'

vi.mock('../infrastructure/logger', () => ({ logEvent: vi.fn() }))

const folders: string[] = []
afterEach(() => {
  for (const folder of folders.splice(0))
    rmSync(folder, { recursive: true, force: true })
})

const analysis: MediaAnalysis = {
  provider: 'generic',
  sourceUrl: 'https://example.com/tone.ogg',
  sourceMediaId: 'tone',
  title: 'Tone',
  artist: null,
  album: null,
  channel: null,
  thumbnail: null,
  durationMs: 1000,
  isPlaylist: false,
  items: [],
  formats: [
    {
      id: 'ogg',
      extension: 'ogg',
      mediaType: 'audio',
      quality: 'Original',
      codec: 'vorbis',
      fps: null,
      bitrateKbps: 128,
      fileSize: null,
      hasAudio: true,
    },
  ],
}
const request: DownloadStartRequest = {
  url: analysis.sourceUrl,
  title: analysis.title,
  provider: 'generic',
  mediaType: 'audio',
  formatId: 'ogg',
  extension: 'ogg',
  hasAudio: true,
  quality: 'Original',
  thumbnail: null,
  artist: null,
  channel: null,
  durationMs: 1000,
}

function setup(download: MediaProvider['download']) {
  const folder = mkdtempSync(join(tmpdir(), 'orbe-manager-'))
  folders.push(folder)
  const connection = openDatabase(join(folder, 'db.sqlite'), resolve('drizzle'))
  const provider: MediaProvider = {
    id: 'generic',
    name: 'Test',
    canHandle: async () => true,
    analyze: async () => analysis,
    getFormats: async () => analysis.formats,
    download,
  }
  const manager = new DownloadManager(
    connection.db,
    new MediaProviderRegistry([provider]),
    () => folder,
    () => 1,
  )
  return { folder, connection, manager }
}

describe('DownloadManager', () => {
  it('recovers a deleted download into a new folder without replacing its library identity, favorites or playlists', async () => {
    let fail = false
    const { folder, connection, manager } = setup(
      async (_request, directory) => {
        if (fail) throw new Error('Source unavailable')
        mkdirSync(directory, { recursive: true })
        const path = join(directory, 'Tone.ogg')
        writeFileSync(path, 'restored audio')
        return path
      },
    )
    try {
      const original = await manager.start(request)
      await vi.waitFor(() =>
        expect(
          manager.list().find((row) => row.id === original.id)?.status,
        ).toBe('completed'),
      )
      const library = new LibraryService(connection.db)
      const item = library.list()[0]!
      library.setFavorite(item.id, true)
      library.markPlayed(item.id)
      const playlists = new LocalPlaylistService(connection.db, library)
      const playlist = playlists.create('My collection', '')
      playlists.add(playlist.id, item.id)
      unlinkSync(item.filePath)
      const destination = join(folder, 'new-downloads')
      fail = true
      const failed = await manager.retry(original.id, destination)
      await vi.waitFor(() =>
        expect(manager.list().find((row) => row.id === failed.id)?.status).toBe(
          'failed',
        ),
      )
      expect(library.find(item.id)?.favorite).toBe(true)
      fail = false
      const restored = await manager.retry(failed.id, destination)
      await vi.waitFor(() =>
        expect(
          manager.list().find((row) => row.id === restored.id)?.status,
        ).toBe('completed'),
      )
      expect(library.list()).toHaveLength(1)
      expect(library.find(item.id)).toMatchObject({
        filePath: join(destination, 'Tone.ogg'),
        favorite: true,
        playCount: 1,
      })
      expect(playlists.list()[0]?.items[0]?.id).toBe(item.id)
    } finally {
      await manager.dispose()
      connection.sqlite.close()
    }
  })
  it('persists byte totals and processing, and ignores progress after cancellation', async () => {
    let events: DownloadEvents | undefined
    const { connection, manager } = setup(
      async (_request, _directory, callbacks, signal) => {
        events = callbacks
        return new Promise<string>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          }),
        )
      },
    )
    try {
      const record = await manager.start(request)
      await vi.waitFor(() => expect(events).toBeDefined())
      events!.onProgress({
        percent: 100,
        downloadedBytes: 8192,
        totalBytes: 8192,
        speedBytesPerSecond: 1024,
        etaSeconds: 0,
      })
      expect(manager.list()[0]).toMatchObject({
        progress: 100,
        fileSize: 8192,
        downloadedBytes: 8192,
      })
      events!.onProcessing?.()
      expect(manager.list()[0]).toMatchObject({
        status: 'processing',
        etaSeconds: null,
        speedBytesPerSecond: null,
      })
      manager.cancel(record.id)
      events!.onProgress({
        percent: 100,
        downloadedBytes: 8192,
        totalBytes: 8192,
        speedBytesPerSecond: 0,
        etaSeconds: 0,
      })
      events!.onProcessing?.()
      expect(manager.list()[0]?.status).toBe('cancelled')
    } finally {
      await manager.dispose()
      connection.sqlite.close()
    }
  })
  it('cancels a queued or active task without marking it completed', async () => {
    const { connection, manager } = setup(
      async (_request, _directory, _events, signal) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        }),
    )
    const record = await manager.start(request)
    manager.cancel(record.id)
    await vi.waitFor(() => expect(manager.list()[0]?.status).toBe('cancelled'))
    await manager.dispose()
    connection.sqlite.close()
  })

  it('retries a failed task and persists the completed file in the library', async () => {
    let attempts = 0
    const { folder, connection, manager } = setup(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('Network unavailable')
      const file = join(folder, 'tone.ogg')
      writeFileSync(file, 'test-media')
      return file
    })
    const first = await manager.start(request)
    await vi.waitFor(() =>
      expect(manager.list().find((item) => item.id === first.id)?.status).toBe(
        'failed',
      ),
    )
    const second = await manager.retry(first.id)
    await vi.waitFor(() =>
      expect(manager.list().find((item) => item.id === second.id)?.status).toBe(
        'completed',
      ),
    )
    expect(connection.db.select().from(mediaLibrary).all()).toHaveLength(1)
    const repeated = await manager.retry(second.id)
    await vi.waitFor(() =>
      expect(
        manager.list().find((item) => item.id === repeated.id)?.status,
      ).toBe('completed'),
    )
    manager.remove(second.id)
    expect(manager.list().some((item) => item.id === second.id)).toBe(false)
    expect(connection.db.select().from(mediaLibrary).all()).toHaveLength(1)
    await manager.dispose()
    connection.sqlite.close()
  })

  it('uses the selected destination directory for the actual provider download', async () => {
    let usedDirectory = ''
    const { folder, connection, manager } = setup(
      async (_request, directory) => {
        usedDirectory = directory
        const file = join(directory, 'tone.ogg')
        writeFileSync(file, 'test-media')
        return file
      },
    )
    const destination = join(folder, 'chosen')
    mkdirSync(destination)
    const record = await manager.start(request, destination)
    await vi.waitFor(() =>
      expect(manager.list().find((item) => item.id === record.id)?.status).toBe(
        'completed',
      ),
    )
    expect(usedDirectory).toBe(destination)
    await manager.dispose()
    connection.sqlite.close()
  })
})
