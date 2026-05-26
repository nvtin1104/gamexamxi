CREATE TABLE `user_permissions` (
	`user_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `group_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `permission_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `user_to_groups`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`password_hash` text NOT NULL,
	`gg_id` text,
	`birthdate` integer,
	`phone` text,
	`address` text,
	`points_earned` integer DEFAULT 0 NOT NULL,
	`points_spent` integer DEFAULT 0 NOT NULL,
	`points_balance` integer DEFAULT 0 NOT NULL,
	`points_expired` integer DEFAULT 0 NOT NULL,
	`points_expiring` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`experience` integer DEFAULT 0 NOT NULL,
	`login_streak` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`block_expires_at` integer,
	`block_reason` text,
	`ban_reason` text,
	`avatar` text,
	`last_login_at` integer,
	`last_login_ip` text,
	`email_verified_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "name", "role", "password_hash", "gg_id", "birthdate", "phone", "address", "points_earned", "points_spent", "points_balance", "points_expired", "points_expiring", "level", "experience", "login_streak", "status", "block_expires_at", "block_reason", "ban_reason", "avatar", "last_login_at", "last_login_ip", "email_verified_at", "created_at", "updated_at") SELECT "id", "email", "name", "role", "password_hash", "gg_id", "birthdate", "phone", "address", "points_earned", "points_spent", "points_balance", "points_expired", "points_expiring", "level", "experience", "login_streak", "status", "block_expires_at", "block_reason", "ban_reason", "avatar", "last_login_at", "last_login_ip", "email_verified_at", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_gg_id_unique` ON `users` (`gg_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `users` (`status`);