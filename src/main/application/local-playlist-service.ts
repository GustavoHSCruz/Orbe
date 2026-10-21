import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { localPlaylistItems, localPlaylists } from '../database/schema'
import type { openDatabase } from '../database/database'
import type { LibraryService } from './library-service'
import type { LocalPlaylist } from '../../shared/contracts/local-playlists'

type Database = ReturnType<typeof openDatabase>['db']

export class LocalPlaylistService {
  constructor(
    private readonly db: Database,
    private readonly library: LibraryService,
  ) {}

  list(): LocalPlaylist[] {
    const entries = this.db.select().from(localPlaylistItems).all()
    return this.db
      .select()
      .from(localPlaylists)
      .all()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((playlist) => ({
        ...playlist,
        items: entries
          .filter((entry) => entry.playlistId === playlist.id)
          .sort((a, b) => a.position - b.position)
          .flatMap((entry) => {
            const item = this.library.find(entry.mediaId)
            return item ? [{ ...item, playlistItemId: entry.id }] : []
          }),
      }))
  }

  create(name: string, description: string): LocalPlaylist {
    const now = Date.now()
    const id = randomUUID()
    this.db
      .insert(localPlaylists)
      .values({ id, name, description, createdAt: now, updatedAt: now })
      .run()
    return this.list().find((playlist) => playlist.id === id)!
  }

  update(id: string, name: string, description: string): void {
    this.require(id)
    this.db
      .update(localPlaylists)
      .set({ name, description, updatedAt: Date.now() })
      .where(eq(localPlaylists.id, id))
      .run()
  }

  delete(id: string): void {
    this.require(id)
    this.db.delete(localPlaylists).where(eq(localPlaylists.id, id)).run()
  }

  add(playlistId: string, mediaId: string): void {
    this.require(playlistId)
    if (!this.library.find(mediaId))
      throw new Error('Mídia não encontrada na biblioteca.')
    const entries = this.db
      .select()
      .from(localPlaylistItems)
      .where(eq(localPlaylistItems.playlistId, playlistId))
      .all()
    if (entries.some((entry) => entry.mediaId === mediaId)) return
    this.db
      .insert(localPlaylistItems)
      .values({
        id: randomUUID(),
        playlistId,
        mediaId,
        position: Math.max(-1, ...entries.map((entry) => entry.position)) + 1,
        addedAt: Date.now(),
      })
      .run()
    this.touch(playlistId)
  }

  addAt(playlistId: string, mediaId: string, position: number): void {
    this.require(playlistId)
    if (!this.library.find(mediaId)) throw new Error('Mídia não encontrada na biblioteca.')
    const existing = this.db.select().from(localPlaylistItems)
      .where(eq(localPlaylistItems.playlistId, playlistId)).all()
    // Make room if the user added or moved a song while downloads were running.
    this.db.transaction((tx) => {
      existing.filter((item) => item.position >= position)
        .sort((a, b) => b.position - a.position)
        .forEach((item) => tx.update(localPlaylistItems)
          .set({ position: item.position + 1 })
          .where(eq(localPlaylistItems.id, item.id)).run())
      tx.insert(localPlaylistItems).values({
        id: randomUUID(), playlistId, mediaId, position, addedAt: Date.now(),
      }).run()
    })
    this.touch(playlistId)
  }

  remove(playlistId: string, itemId: string): void {
    this.require(playlistId)
    this.db
      .delete(localPlaylistItems)
      .where(
        and(
          eq(localPlaylistItems.playlistId, playlistId),
          eq(localPlaylistItems.id, itemId),
        ),
      )
      .run()
    this.touch(playlistId)
  }

  move(playlistId: string, itemId: string, direction: 'up' | 'down'): void {
    this.require(playlistId)
    const entries = this.db
      .select()
      .from(localPlaylistItems)
      .where(eq(localPlaylistItems.playlistId, playlistId))
      .all()
      .sort((a, b) => a.position - b.position)
    const index = entries.findIndex((entry) => entry.id === itemId)
    const swap = entries[index + (direction === 'up' ? -1 : 1)]
    const current = entries[index]
    if (!current || !swap) return
    this.db
      .update(localPlaylistItems)
      .set({ position: swap.position })
      .where(eq(localPlaylistItems.id, current.id))
      .run()
    this.db
      .update(localPlaylistItems)
      .set({ position: current.position })
      .where(eq(localPlaylistItems.id, swap.id))
      .run()
    this.touch(playlistId)
  }

  private require(id: string): void {
    if (
      !this.db
        .select()
        .from(localPlaylists)
        .where(eq(localPlaylists.id, id))
        .get()
    )
      throw new Error('Playlist não encontrada.')
  }
  private touch(id: string): void {
    this.db
      .update(localPlaylists)
      .set({ updatedAt: Date.now() })
      .where(eq(localPlaylists.id, id))
      .run()
  }
}
