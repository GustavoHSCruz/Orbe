CREATE TABLE `playlist_import_items` (
	`id` text PRIMARY KEY,
	`import_id` text NOT NULL,
	`position` integer NOT NULL,
	`spotify_id` text DEFAULT '' NOT NULL,
	`title` text,
	`artist` text,
	`duration_ms` integer,
	`match_status` text DEFAULT 'pending' NOT NULL,
	`candidates_json` text DEFAULT '[]' NOT NULL,
	`youtube_url` text,
	`download_id` text,
	`error_message` text,
	CONSTRAINT `fk_playlist_import_items_import_id_playlist_imports_id_fk` FOREIGN KEY (`import_id`) REFERENCES `playlist_imports`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_playlist_import_items_download_id_downloads_id_fk` FOREIGN KEY (`download_id`) REFERENCES `downloads`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `playlist_imports` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`source_url` text NOT NULL,
	`origin` text DEFAULT 'public' NOT NULL,
	`expected_count` integer,
	`matching` integer DEFAULT false NOT NULL,
	`downloading` integer DEFAULT false NOT NULL,
	`local_playlist_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_playlist_imports_local_playlist_id_local_playlists_id_fk` FOREIGN KEY (`local_playlist_id`) REFERENCES `local_playlists`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS `local_playlist_media_idx`;--> statement-breakpoint
CREATE INDEX `local_playlist_position_idx` ON `local_playlist_items` (`playlist_id`,`position`);--> statement-breakpoint
CREATE INDEX `playlist_import_position_idx` ON `playlist_import_items` (`import_id`,`position`);