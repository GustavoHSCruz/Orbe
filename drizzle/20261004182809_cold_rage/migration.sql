ALTER TABLE `downloads` ADD `downloaded_bytes` integer;--> statement-breakpoint
ALTER TABLE `downloads` ADD `speed_bytes_per_second` integer;--> statement-breakpoint
ALTER TABLE `downloads` ADD `eta_seconds` integer;