// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { migrateBrandPreferences, resolveDatabasePath, resolveUserData } from './brand-compatibility'
import { SettingsSchema } from '../../shared/contracts/media'

const folders: string[] = []
function fixture() {
  const folder = mkdtempSync(join(tmpdir(), 'orbe-migration-'))
  folders.push(folder)
  return folder
}
afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }) })

test('reuses the previous profile and database without moving user files', () => {
  const folder = fixture()
  const previous = join(folder, 'Clipora')
  mkdirSync(previous)
  writeFileSync(join(previous, 'clipora.sqlite'), 'existing library')
  expect(resolveUserData(folder, join(folder, 'Orbe'))).toBe(previous)
  expect(resolveDatabasePath(previous)).toBe(join(previous, 'clipora.sqlite'))
  mkdirSync(join(folder, 'Orbe'))
  expect(resolveUserData(folder, join(folder, 'Orbe'))).toBe(previous)
  writeFileSync(join(folder, 'Orbe', 'orbe.sqlite'), 'new profile')
  expect(resolveUserData(folder, join(folder, 'Orbe'))).toBe(join(folder, 'Orbe'))
  writeFileSync(join(previous, 'orbe.sqlite'), 'new library')
  expect(resolveDatabasePath(previous)).toBe(join(previous, 'orbe.sqlite'))
})

test('uses the new paths on a fresh installation', () => {
  const folder = fixture()
  expect(resolveUserData(folder, join(folder, 'Orbe'))).toBe(join(folder, 'Orbe'))
  expect(resolveDatabasePath(folder)).toBe(join(folder, 'orbe.sqlite'))
})

test('upgrades saved Discord choices without changing unrelated preferences', () => {
  const current = SettingsSchema.parse({ downloadDirectory: 'C:/Music', concurrentDownloads: 2, theme: 'dark' })
  const legacy = { ...current, discord: { ...current.discord, source: 'clipora', priority: 'clipora' } }
  const migrated = SettingsSchema.parse(migrateBrandPreferences(legacy))
  expect(migrated.discord.source).toBe('orbe')
  expect(migrated.discord.priority).toBe('orbe')
  expect(migrated.downloadDirectory).toBe(current.downloadDirectory)
  expect(legacy.discord.source).toBe('clipora')
})
