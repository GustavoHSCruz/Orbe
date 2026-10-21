import { randomUUID } from 'node:crypto'
import { basename, extname, resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { downloads, mediaLibrary } from '../database/schema'
import type { openDatabase } from '../database/database'
import type { LibraryRecord } from '../../shared/contracts/media'

type Database = ReturnType<typeof openDatabase>['db']
const audioExtensions = new Set([
  '.mp3',
  '.m4a',
  '.aac',
  '.flac',
  '.ogg',
  '.wav',
  '.opus',
])
const videoExtensions = new Set(['.mp4', '.webm'])
export function isMediaFile(filePath: string): boolean {
  const extension = extname(filePath).toLowerCase()
  return audioExtensions.has(extension) || videoExtensions.has(extension)
}

export class LibraryService {
  constructor(private readonly db: Database) {}

  list(): LibraryRecord[] {
    return this.db
      .select()
      .from(mediaLibrary)
      .all()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        id: row.id,
        provider: row.provider as LibraryRecord['provider'],
        mediaType: row.mediaType as LibraryRecord['mediaType'],
        title: row.title,
        artist: row.artist,
        album: row.album,
        thumbnail: row.thumbnail,
        durationMs: row.durationMs,
        format: row.format,
        filePath: row.filePath,
        favorite: row.favorite,
        playCount: row.playCount,
        createdAt: row.createdAt,
      }))
  }

  importFiles(paths: string[]): LibraryRecord[] {
    for (const path of paths) {
      const filePath = resolve(path)
      const extension = extname(filePath).toLowerCase()
      if (!audioExtensions.has(extension) && !videoExtensions.has(extension))
        continue
      this.db
        .insert(mediaLibrary)
        .values({
          id: randomUUID(),
          provider: 'local',
          mediaType: audioExtensions.has(extension) ? 'audio' : 'video',
          title: basename(filePath, extension),
          filePath,
          format: extension.slice(1),
          createdAt: Date.now(),
        })
        .onConflictDoNothing()
        .run()
    }
    return this.list()
  }

  downloadFor(id: string) {
    const row = this.db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.id, id))
      .get()
    return row?.downloadId
      ? (this.db
          .select()
          .from(downloads)
          .where(eq(downloads.id, row.downloadId))
          .get() ?? null)
      : null
  }

  relink(id: string, filePath: string): void {
    const item = this.find(id)
    if (!item) throw new Error('Item da biblioteca não encontrado.')
    const target = resolve(filePath)
    const duplicate = this.db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.filePath, target))
      .get()
    if (duplicate && duplicate.id !== id)
      throw new Error(
        'Este arquivo já está vinculado a outro item da biblioteca.',
      )
    this.db.transaction((tx) => {
      tx.update(mediaLibrary)
        .set({ filePath: target })
        .where(eq(mediaLibrary.id, id))
        .run()
      const row = tx
        .select()
        .from(mediaLibrary)
        .where(eq(mediaLibrary.id, id))
        .get()
      if (row?.downloadId)
        tx.update(downloads)
          .set({ filePath: target })
          .where(eq(downloads.id, row.downloadId))
          .run()
    })
  }

  find(id: string): LibraryRecord | undefined {
    return this.list().find((item) => item.id === id)
  }
  setDuration(id: string, durationMs: number): void {
    this.db
      .update(mediaLibrary)
      .set({ durationMs })
      .where(eq(mediaLibrary.id, id))
      .run()
  }
  setFavorite(id: string, favorite: boolean): void {
    this.db
      .update(mediaLibrary)
      .set({ favorite })
      .where(eq(mediaLibrary.id, id))
      .run()
  }
  remove(id: string): void {
    this.db.delete(mediaLibrary).where(eq(mediaLibrary.id, id)).run()
  }
  markPlayed(id: string): void {
    const item = this.db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.id, id))
      .get()
    if (item)
      this.db
        .update(mediaLibrary)
        .set({ playCount: item.playCount + 1, lastPlayedAt: Date.now() })
        .where(eq(mediaLibrary.id, id))
        .run()
  }
}
