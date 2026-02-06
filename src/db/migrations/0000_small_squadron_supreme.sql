CREATE TABLE `group_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` integer NOT NULL,
	`summary_interval` integer DEFAULT 21600 NOT NULL,
	`min_messages_for_summary` integer DEFAULT 10 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`summary_format` text DEFAULT 'markdown' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`max_daily_tokens` integer,
	`max_summary_tokens` integer,
	`token_usage_alert_percent` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_configs_chat_id_unique` ON `group_configs` (`chat_id`);--> statement-breakpoint
CREATE TABLE `message_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_db_id` integer NOT NULL,
	`attachment_type` text NOT NULL,
	`file_id` text NOT NULL,
	`file_unique_id` text NOT NULL,
	`file_size` integer,
	`mime_type` text,
	`file_name` text,
	`duration` integer,
	`width` integer,
	`height` integer,
	`local_path` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`message_db_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `message_references` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_message_id` integer NOT NULL,
	`target_message_id` integer NOT NULL,
	`reference_type` text NOT NULL,
	`resolved_username` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`content` text,
	`timestamp` integer NOT NULL,
	`thread_id` integer,
	`reply_to_message_id` integer,
	`message_type` text DEFAULT 'text' NOT NULL,
	`sender_first_name` text,
	`sender_last_name` text,
	`forward_origin` text,
	`media_group_id` text,
	`raw_json` text,
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
	`format` text DEFAULT 'markdown' NOT NULL,
	`alert_sent` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `summary_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`summary_id` integer,
	`chat_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`feedback_text` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`summary_id`) REFERENCES `summaries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_engagement` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`command_count` integer DEFAULT 0 NOT NULL,
	`reply_count` integer DEFAULT 0 NOT NULL,
	`mention_count` integer DEFAULT 0 NOT NULL,
	`last_active` integer NOT NULL,
	`daily_active_streak` integer DEFAULT 0 NOT NULL,
	`average_response_time` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
