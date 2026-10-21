// @vitest-environment node
import { afterEach, expect, test } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  renameSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { openDatabase } from '../database/database'
import { LibraryService } from './library-service'
import { SettingsService } from './settings-service'
import {
  LibraryLocationsService,
  relativeMediaPath,
} from './library-locations-service'
import { LocalPlaylistService } from './local-playlist-service'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'orbe-folders-'))
  const initial = join(root, 'downloads')
  mkdirSync(initial)
  const connection = openDatabase(join(root, 'orbe.sqlite'), resolve('drizzle'))
  const library = new LibraryService(connection.db)
  const settings = new SettingsService(connection.db, initial)
  const service = new LibraryLocationsService(library, settings)
  cleanups.push(async () => {
    await service.dispose()
    connection.sqlite.close()
    rmSync(root, { recursive: true, force: true })
  })
  return { root, initial, connection, library, settings, service }
}

test('indexes multiple roots recursively, skips transient files and deduplicates overlapping folders', async () => {
  const { root, initial, library, settings, service } = setup()
  const extra = join(root, 'external')
  const nested = join(extra, 'albums')
  mkdirSync(nested, { recursive: true })
  writeFileSync(join(initial, 'one.mp3'), 'audio')
  writeFileSync(join(nested, 'two.opus'), 'audio')
  writeFileSync(join(nested, 'three.mp4'), 'video')
  writeFileSync(join(nested, '.conversion.mp3'), 'incomplete')
  writeFileSync(join(nested, 'notes.txt'), 'text')
  await service.add(extra)
  await service.add(nested)
  await service.scan()
  expect(library.list()).toHaveLength(3)
  expect(settings.get().libraryDirectories).toEqual([extra, nested])
  expect(
    library.list().filter((item) => item.mediaType === 'video'),
  ).toHaveLength(1)
})

test('requires the previous-folder choice and preserves the collection when changing download destinations', async () => {
  const { root, initial, library, settings, service } = setup()
  writeFileSync(join(initial, 'one.mp3'), 'audio')
  await service.scan()
  const id = library.list()[0]!.id
  const next = join(root, 'new-downloads')
  mkdirSync(next)
  await expect(
    service.saveSettings({ ...settings.get(), downloadDirectory: next }),
  ).rejects.toThrow('pasta anterior')
  expect(settings.get().downloadDirectory).toBe(initial)
  await service.saveSettings(
    { ...settings.get(), downloadDirectory: next },
    'keep',
  )
  expect(settings.get().libraryDirectories).toContain(initial)
  expect(library.find(id)?.filePath).toBe(join(initial, 'one.mp3'))
  await service.remove(initial)
  expect(library.find(id)).toBeDefined()
  expect(settings.get().libraryDirectories).not.toContain(initial)
  await service.saveSettings(
    { ...settings.get(), downloadDirectory: initial },
    'stop',
  )
  expect(settings.get().libraryDirectories).not.toContain(next)
  expect(library.find(id)).toBeDefined()
})

test('reports missing files without dropping records, and relocates nested paths without losing playlists or favorites', async () => {
  const { root, initial, library, settings, service, connection } = setup()
  mkdirSync(join(initial, 'album'))
  writeFileSync(join(initial, 'album', 'same.mp3'), 'audio')
  await service.scan()
  const item = library.list()[0]!
  library.setFavorite(item.id, true)
  library.markPlayed(item.id)
  const playlists = new LocalPlaylistService(connection.db, library)
  const playlist = playlists.create('Keep me', '')
  playlists.add(playlist.id, item.id)
  const moved = join(root, 'moved')
  renameSync(initial, moved)
  const missing = await service.scan()
  expect(missing.missing[0]?.item.id).toBe(item.id)
  expect(missing.missing[0]?.canDownloadAgain).toBe(false)
  expect(library.list()).toHaveLength(1)
  const recovered = await service.relocate(initial, moved)
  expect(recovered.relinked).toBe(1)
  expect(recovered.missing).toHaveLength(0)
  expect(library.find(item.id)).toMatchObject({
    filePath: join(moved, 'album', 'same.mp3'),
    favorite: true,
    playCount: 1,
  })
  expect(playlists.list()[0]?.items[0]?.id).toBe(item.id)
  expect(settings.get().libraryDirectories).toContain(moved)
})

test('does not guess by filename and refuses an already-linked replacement', async () => {
  const { root, initial, library, service } = setup()
  mkdirSync(join(initial, 'album'))
  writeFileSync(join(initial, 'album', 'same.mp3'), 'audio')
  await service.scan()
  const missingId = library.list()[0]!.id
  rmSync(join(initial, 'album', 'same.mp3'))
  const moved = join(root, 'replacement')
  mkdirSync(moved)
  writeFileSync(join(moved, 'same.mp3'), 'different recording')
  await service.relocate(initial, moved)
  expect(service.snapshot().missing.map((entry) => entry.item.id)).toContain(
    missingId,
  )
  await expect(
    service.locateFile(missingId, join(moved, 'same.mp3')),
  ).rejects.toThrow('outro item')
  expect(
    relativeMediaPath(initial, join(root, 'downloads-other', 'song.mp3')),
  ).toBeNull()
})

test('does not traverse junctions or symbolic links out of a selected folder', async () => {
  const { root, initial, library, service } = setup()
  const outside = join(root, 'private')
  mkdirSync(outside)
  writeFileSync(join(outside, 'private.mp3'), 'audio')
  symlinkSync(
    outside,
    join(initial, 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  await service.scan()
  expect(library.list()).toHaveLength(0)
})
