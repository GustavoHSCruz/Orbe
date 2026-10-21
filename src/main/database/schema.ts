import {
  integer,
  index,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const downloads = sqliteTable('downloads', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  sourceUrl: text('source_url').notNull(),
  sourceMediaId: text('source_media_id'),
  title: text('title').notNull(),
  artist: text('artist'),
  album: text('album'),
  channel: text('channel'),
  thumbnail: text('thumbnail'),
  durationMs: integer('duration_ms'),
  mediaType: text('media_type').notNull(),
  formatId: text('format_id'),
  format: text('format').notNull(),
  quality: text('quality'),
  codec: text('codec'),
  bitrateKbps: integer('bitrate_kbps'),
  fileSize: integer('file_size'),
  filePath: text('file_path'),
  status: text('status').notNull(),
  progress: real('progress').notNull().default(0),
  downloadedBytes: integer('downloaded_bytes'),
  speedBytesPerSecond: integer('speed_bytes_per_second'),
  etaSeconds: integer('eta_seconds'),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
  errorMessage: text('error_message'),
})

export const downloadItems = sqliteTable('download_items', {
  id: text('id').primaryKey(),
  parentDownloadId: text('parent_download_id')
    .notNull()
    .references(() => downloads.id, { onDelete: 'cascade' }),
  sourceMediaId: text('source_media_id').notNull(),
  title: text('title').notNull(),
  selected: integer('selected', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull(),
})

export const playlistsCache = sqliteTable(
  'playlists_cache',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    remoteId: text('remote_id').notNull(),
    title: text('title').notNull(),
    thumbnail: text('thumbnail'),
    itemCount: integer('item_count').notNull().default(0),
    lastSyncAt: integer('last_sync_at').notNull(),
  },
  (table) => [
    uniqueIndex('playlist_remote_idx').on(table.provider, table.remoteId),
  ],
)

export const mediaLibrary = sqliteTable('media_library', {
  id: text('id').primaryKey(),
  downloadId: text('download_id').references(() => downloads.id, {
    onDelete: 'set null',
  }),
  provider: text('provider').notNull(),
  mediaType: text('media_type').notNull(),
  title: text('title').notNull(),
  artist: text('artist'),
  album: text('album'),
  thumbnail: text('thumbnail'),
  durationMs: integer('duration_ms'),
  filePath: text('file_path').notNull().unique(),
  format: text('format').notNull(),
  bitrateKbps: integer('bitrate_kbps'),
  createdAt: integer('created_at').notNull(),
  lastPlayedAt: integer('last_played_at'),
  playCount: integer('play_count').notNull().default(0),
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
})

export const localPlaylists = sqliteTable('local_playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const localPlaylistItems = sqliteTable(
  'local_playlist_items',
  {
    id: text('id').primaryKey(),
    playlistId: text('playlist_id')
      .notNull()
      .references(() => localPlaylists.id, { onDelete: 'cascade' }),
    mediaId: text('media_id')
      .notNull()
      .references(() => mediaLibrary.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    addedAt: integer('added_at').notNull(),
  },
  (table) => [index('local_playlist_position_idx').on(table.playlistId, table.position)],
)

export const playlistImports = sqliteTable('playlist_imports', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sourceUrl: text('source_url').notNull(),
  origin: text('origin').notNull().default('public'),
  expectedCount: integer('expected_count'),
  matching: integer('matching', { mode: 'boolean' }).notNull().default(false),
  downloading: integer('downloading', { mode: 'boolean' }).notNull().default(false),
  localPlaylistId: text('local_playlist_id').references(() => localPlaylists.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const playlistImportItems = sqliteTable(
  'playlist_import_items',
  {
    id: text('id').primaryKey(),
    importId: text('import_id').notNull().references(() => playlistImports.id, {
      onDelete: 'cascade',
    }),
    position: integer('position').notNull(),
    spotifyId: text('spotify_id').notNull().default(''),
    title: text('title'),
    artist: text('artist'),
    durationMs: integer('duration_ms'),
    matchStatus: text('match_status').notNull().default('pending'),
    candidatesJson: text('candidates_json').notNull().default('[]'),
    youtubeUrl: text('youtube_url'),
    downloadId: text('download_id').references(() => downloads.id, {
      onDelete: 'set null',
    }),
    linked: integer('linked', { mode: 'boolean' }).notNull().default(false),
    errorMessage: text('error_message'),
  },
  (table) => [index('playlist_import_position_idx').on(table.importId, table.position)],
)

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
