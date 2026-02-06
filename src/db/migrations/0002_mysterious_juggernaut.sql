CREATE TABLE `admin_group_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_chat_id` integer NOT NULL,
	`controlled_chat_id` integer NOT NULL,
	`linked_by_user_id` integer NOT NULL,
	`controlled_chat_title` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_group_links_admin_chat_id_unique` ON `admin_group_links` (`admin_chat_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_group_links_controlled_chat_id_unique` ON `admin_group_links` (`controlled_chat_id`);--> statement-breakpoint
CREATE TABLE `linking_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`admin_chat_id` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `linking_tokens_token_unique` ON `linking_tokens` (`token`);