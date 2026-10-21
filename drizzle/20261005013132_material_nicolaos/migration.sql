CREATE TABLE `local_playlist_items` (
	`id` text PRIMARY KEY,
	`playlist_id` text NOT NULL,
	`media_id` text NOT NULL,
	`position` integer NOT NULL,
	`added_at` integer NOT NULL,
	CONSTRAINT `fk_local_playlist_items_playlist_id_local_playlists_id_fk` FOREIGN KEY (`playlist_id`) REFERENCES `local_playlists`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_local_playlist_items_media_id_media_library_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media_library`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `local_playlists` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `local_playlist_media_idx` ON `local_playlist_items` (`playlist_id`,`media_id`);