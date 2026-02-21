CREATE TABLE `monthly_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`target` integer DEFAULT 20 NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_targets_project_month_year_idx` ON `monthly_targets` (`project_id`,`month`,`year`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sheet_id` text DEFAULT '' NOT NULL,
	`sheet_name` text DEFAULT '' NOT NULL,
	`monthly_target` integer DEFAULT 20 NOT NULL,
	`ranking_sheet_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stt` integer DEFAULT 0 NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`parent_keyword` text DEFAULT '' NOT NULL,
	`keyword_sub` text DEFAULT '' NOT NULL,
	`keyword_count` integer DEFAULT 0 NOT NULL,
	`keywords_list` text DEFAULT '[]' NOT NULL,
	`search_volume` integer DEFAULT 0 NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`outline` text DEFAULT '' NOT NULL,
	`timeline_outline` text DEFAULT '' NOT NULL,
	`status_outline` text DEFAULT '' NOT NULL,
	`pic` text DEFAULT '' NOT NULL,
	`content_file` text DEFAULT '' NOT NULL,
	`deadline` text,
	`status_content` text DEFAULT '' NOT NULL,
	`link_publish` text DEFAULT '' NOT NULL,
	`publish_date` text,
	`note` text DEFAULT '' NOT NULL,
	`month_year` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `keyword_rankings` (
	`id` text PRIMARY KEY NOT NULL,
	`keyword` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`position` real NOT NULL,
	`date` text NOT NULL,
	`project_id` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `seo_results` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`max_score` integer DEFAULT 100 NOT NULL,
	`content_score` integer DEFAULT 0 NOT NULL,
	`content_max` integer DEFAULT 0 NOT NULL,
	`images_score` integer DEFAULT 0 NOT NULL,
	`images_max` integer DEFAULT 0 NOT NULL,
	`technical_score` integer DEFAULT 0 NOT NULL,
	`technical_max` integer DEFAULT 0 NOT NULL,
	`details` text DEFAULT '[]' NOT NULL,
	`links` text DEFAULT '{"internal":[],"external":[]}' NOT NULL,
	`keywords` text DEFAULT '{"primary":"","sub":[]}' NOT NULL,
	`checked_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seo_results_url_unique` ON `seo_results` (`url`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`role` text DEFAULT 'Content Writer' NOT NULL,
	`projects` text DEFAULT '[]' NOT NULL,
	`start_date` text,
	`email` text,
	`phone` text,
	`bank_name` text,
	`bank_account` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `salary_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`member_name` text NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `salary_payments_member_month_year_idx` ON `salary_payments` (`member_name`,`month`,`year`);--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`project_name` text,
	`status` text DEFAULT 'running' NOT NULL,
	`tasks_synced` integer DEFAULT 0 NOT NULL,
	`projects_synced` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer,
	`error` text,
	`started_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text
);
