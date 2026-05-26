CREATE TABLE `item_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo` text NOT NULL,
	`description` text NOT NULL,
	`link_social` text NOT NULL,
	`level` integer DEFAULT 0,
	`parent_id` text,
	`type` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pickem_event_options` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`event_item_id` text NOT NULL,
	`is_winning_option` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `pickem_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_item_id`) REFERENCES `item_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pickem_event_picks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`option_id` text NOT NULL,
	`picked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `pickem_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_id`) REFERENCES `pickem_event_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pickem_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`thumbnail` text NOT NULL,
	`description` text NOT NULL,
	`win_points` integer NOT NULL,
	`pick_points` integer NOT NULL,
	`win_exp` integer NOT NULL,
	`pick_exp` integer NOT NULL,
	`event_date` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
