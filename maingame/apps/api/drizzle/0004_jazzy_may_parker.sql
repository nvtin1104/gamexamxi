PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_item_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo` text,
	`description` text,
	`link_social` text DEFAULT ('[]'),
	`level` integer DEFAULT 0,
	`parent_id` text,
	`type` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_item_events`("id", "name", "logo", "description", "link_social", "level", "parent_id", "type", "created_by", "created_at", "updated_at") SELECT "id", "name", "logo", "description", "link_social", "level", "parent_id", "type", "created_by", "created_at", "updated_at" FROM `item_events`;--> statement-breakpoint
DROP TABLE `item_events`;--> statement-breakpoint
ALTER TABLE `__new_item_events` RENAME TO `item_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `pickem_events` ADD `close_picks_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pickem_events` ADD `max_pick_items` integer NOT NULL;