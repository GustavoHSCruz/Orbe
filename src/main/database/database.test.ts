// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { openDatabase } from './database'
import { downloads } from './schema'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true })
})

describe('SQLite persistence', () => {
  it('migrates and keeps downloads after reopening', () => {
    const directory = mkdtempSync(join(tmpdir(), 'orbe-test-'))
    temporaryDirectories.push(directory)
    const filePath = join(directory, 'orbe.sqlite')
    const migrationsFolder = resolve('drizzle')
    const first = openDatabase(filePath, migrationsFolder)
    first.db
      .insert(downloads)
      .values({
        id: 'test-1',
        provider: 'generic',
        sourceUrl: 'https://example.org/media',
        title: 'Test media',
        mediaType: 'audio',
        format: 'mp3',
        status: 'completed',
        progress: 100,
        createdAt: Date.now(),
      })
      .run()
    first.sqlite.close()

    const second = openDatabase(filePath, migrationsFolder)
    expect(second.db.select().from(downloads).all()).toHaveLength(1)
    expect(second.db.select().from(downloads).get()?.title).toBe('Test media')
    second.sqlite.close()
  })
})
