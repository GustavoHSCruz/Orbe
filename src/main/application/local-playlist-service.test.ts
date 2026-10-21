// @vitest-environment node
import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { openDatabase } from '../database/database'
import { mediaLibrary } from '../database/schema'
import { LibraryService } from './library-service'
import { LocalPlaylistService } from './local-playlist-service'

let directory: string | null = null
afterEach(() => {
  if (directory) rmSync(directory, { recursive: true, force: true })
  directory = null
})

it('keeps out-of-order downloads and repeated songs in source order', () => {
  directory = mkdtempSync(join(tmpdir(), 'orbe-playlist-'))
  const connection = openDatabase(join(directory, 'orbe.sqlite'), resolve('drizzle'))
  const now = Date.now()
  for (const id of ['one', 'two']) {
    connection.db.insert(mediaLibrary).values({
      id, provider: 'youtube', mediaType: 'audio', title: id,
      filePath: join(directory, `${id}.mp3`), format: 'mp3', createdAt: now,
    }).run()
  }
  const service = new LocalPlaylistService(connection.db, new LibraryService(connection.db))
  const playlist = service.create('Rock', '')
  service.addAt(playlist.id, 'one', 2000)
  service.addAt(playlist.id, 'two', 1000)
  service.addAt(playlist.id, 'one', 0)
  const entries = service.list()[0]!.items
  expect(entries.map((item) => item.id)).toEqual(['one', 'two', 'one'])
  expect(new Set(entries.map((item) => item.playlistItemId)).size).toBe(3)
  service.remove(playlist.id, entries[0]!.playlistItemId)
  expect(service.list()[0]!.items.map((item) => item.id)).toEqual(['two', 'one'])
  connection.sqlite.close()
})
