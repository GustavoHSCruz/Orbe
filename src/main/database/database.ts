import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'

export function openDatabase(filePath: string, migrationsFolder: string) {
  mkdirSync(dirname(filePath), { recursive: true })
  const sqlite = new DatabaseSync(filePath)
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
  const db = drizzle({ client: sqlite })
  migrate(db, { migrationsFolder })
  return { db, sqlite }
}
