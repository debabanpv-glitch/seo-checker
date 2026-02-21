CREATE TABLE `strategy_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`phase_id` text NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`assigned_to` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`due_date` text,
	`completed_date` text,
	`result` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `strategy_phases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `strategy_phases` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`phase_type` text DEFAULT 'short_term' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`dependencies` text DEFAULT '[]',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `claude_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`project_slug` text,
	`activity_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`input_data` text,
	`output_data` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`worker` text DEFAULT 'claude-code' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`content` text,
	`tags` text DEFAULT '[]',
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gsc_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`date` text NOT NULL,
	`period` text DEFAULT 'weekly' NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`ctr` real DEFAULT 0 NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`top_queries` text,
	`top_pages` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gsc_snapshots_project_date_period_idx` ON `gsc_snapshots` (`project_id`,`date`,`period`);--> statement-breakpoint
ALTER TABLE `projects` ADD `slug` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `website` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `industry` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `gsc_property` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `updated_at` text DEFAULT (datetime('now'));--> statement-breakpoint
ALTER TABLE `tasks` ADD `source` text DEFAULT 'sheets' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `assigned_to` text DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE `keyword_rankings` ADD `source` text DEFAULT 'sheets' NOT NULL;