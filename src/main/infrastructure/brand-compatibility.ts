import { existsSync } from 'node:fs'
import { join } from 'node:path'

export function migrateBrandEnvironment(): void {
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('CLIPORA_') && value !== undefined)
      process.env[key.replace(/^CLIPORA_/, 'ORBE_')] ??= value
  }
}

/** Keep existing installations' data in place, including encrypted account tokens. */
export function resolveUserData(appData: string, currentPath: string): string {
  const previousPath = join(appData, 'Clipora')
  const hasLibrary = (directory: string) =>
    existsSync(join(directory, 'orbe.sqlite')) || existsSync(join(directory, 'clipora.sqlite'))
  return !hasLibrary(currentPath) && hasLibrary(previousPath) ? previousPath : currentPath
}

export function resolveDatabasePath(userData: string): string {
  const currentPath = join(userData, 'orbe.sqlite')
  const previousPath = join(userData, 'clipora.sqlite')
  return existsSync(currentPath) || !existsSync(previousPath)
    ? currentPath
    : previousPath
}

export function migrateBrandPreferences(input: unknown): unknown {
  if (!input || typeof input !== 'object' || !('discord' in input)) return input
  const preferences = input as { discord?: Record<string, unknown> }
  if (!preferences.discord || typeof preferences.discord !== 'object') return input
  return {
    ...input,
    discord: {
      ...preferences.discord,
      source: preferences.discord.source === 'clipora' ? 'orbe' : preferences.discord.source,
      priority: preferences.discord.priority === 'clipora' ? 'orbe' : preferences.discord.priority,
    },
  }
}
