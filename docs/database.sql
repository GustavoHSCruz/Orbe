-- Referência consolidada. A aplicação executa as migrations em drizzle/.
PRAGMA foreign_keys = ON;

-- drizzle/20261004173801_lucky_skreet/migration.sql
CREATE TABLE `download_items` (
	`id` text PRIMARY KEY,
	`parent_download_id` text NOT NULL,
	`source_media_id` text NOT NULL,
	`title` text NOT NULL,
	`selected` integer DEFAULT true NOT NULL,
	`status` text NOT NULL,
	CONSTRAINT `fk_download_items_parent_download_id_downloads_id_fk` FOREIGN KEY (`parent_download_id`) REFERENCES `downloads`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` text PRIMARY KEY,
	`provider` text NOT NULL,
	`source_url` text NOT NULL,
	`source_media_id` text,
	`title` text NOT NULL,
	`artist` text,
	`album` text,
	`channel` text,
	`thumbnail` text,
	`duration_ms` integer,
	`media_type` text NOT NULL,
	`format` text NOT NULL,
	`quality` text,
	`codec` text,
	`bitrate_kbps` integer,
	`file_size` integer,
	`file_path` text,
	`status` text NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `media_library` (
	`id` text PRIMARY KEY,
	`download_id` text,
	`provider` text NOT NULL,
	`media_type` text NOT NULL,
	`title` text NOT NULL,
	`artist` text,
	`album` text,
	`thumbnail` text,
	`duration_ms` integer,
	`file_path` text NOT NULL UNIQUE,
	`format` text NOT NULL,
	`bitrate_kbps` integer,
	`created_at` integer NOT NULL,
	`last_played_at` integer,
	`play_count` integer DEFAULT 0 NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_media_library_download_id_downloads_id_fk` FOREIGN KEY (`download_id`) REFERENCES `downloads`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `playlists_cache` (
	`id` text PRIMARY KEY,
	`provider` text NOT NULL,
	`remote_id` text NOT NULL,
	`title` text NOT NULL,
	`thumbnail` text,
	`item_count` integer DEFAULT 0 NOT NULL,
	`last_sync_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlist_remote_idx` ON `playlists_cache` (`provider`,`remote_id`);

-- drizzle/20261004174214_military_mister_sinister/migration.sql
ALTER TABLE `downloads` ADD `format_id` text;

-- drizzle/20261004182809_cold_rage/migration.sql
ALTER TABLE `downloads` ADD `downloaded_bytes` integer;--> statement-breakpoint
ALTER TABLE `downloads` ADD `speed_bytes_per_second` integer;--> statement-breakpoint
ALTER TABLE `downloads` ADD `eta_seconds` integer;

-- drizzle/20261005013132_material_nicolaos/migration.sql
CREATE TABLE `local_playlists` (
  `id` text PRIMARY KEY,
  `name` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE TABLE `local_playlist_items` (
  `id` text PRIMARY KEY,
  `playlist_id` text NOT NULL REFERENCES `local_playlists`(`id`) ON DELETE CASCADE,
  `media_id` text NOT NULL REFERENCES `media_library`(`id`) ON DELETE CASCADE,
  `position` integer NOT NULL,
  `added_at` integer NOT NULL
);
CREATE UNIQUE INDEX `local_playlist_media_idx` ON `local_playlist_items` (`playlist_id`, `media_id`);
