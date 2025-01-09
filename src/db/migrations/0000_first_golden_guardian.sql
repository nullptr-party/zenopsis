CREATE TABLE `group_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` integer NOT NULL,
	`summary_interval` integer DEFAULT 21600 NOT NULL,
	`min_messages_for_summary` integer DEFAULT 10 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_configs_chat_id_unique` ON `group_configs` (`chat_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`content` text NOT NULL,
	`timestamp` integer NOT NULL,
	`thread_id` integer,
	`reply_to_message_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` integer NOT NULL,
	`content` text NOT NULL,
	`message_count` integer NOT NULL,
	`start_timestamp` integer NOT NULL,
	`end_timestamp` integer NOT NULL,
	`tokens_used` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
