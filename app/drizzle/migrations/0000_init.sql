CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`account_type` text NOT NULL,
	`balance` real NOT NULL,
	`default_risk_pct` real DEFAULT 1 NOT NULL,
	`plaid_account_id` text,
	`plaid_access_token` text,
	`balance_updated_at` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`name` text NOT NULL,
	`asset_class` text NOT NULL,
	`exchange` text,
	`active` integer DEFAULT 1 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_ticker_unique` ON `assets` (`ticker`);--> statement-breakpoint
CREATE TABLE `checklist_factors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weight` integer NOT NULL,
	`score_type` text NOT NULL,
	`config_json` text,
	`sort_order` integer NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `factor_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evaluation_id` integer NOT NULL,
	`factor_id` integer NOT NULL,
	`raw_value` text NOT NULL,
	`normalized_score` real NOT NULL,
	`max_score` real NOT NULL,
	FOREIGN KEY (`evaluation_id`) REFERENCES `trade_evaluations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`factor_id`) REFERENCES `checklist_factors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_factor_scores_evaluation_id` ON `factor_scores` (`evaluation_id`);--> statement-breakpoint
CREATE TABLE `levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`price` real NOT NULL,
	`label` text NOT NULL,
	`level_type` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_levels_asset_id` ON `levels` (`asset_id`);--> statement-breakpoint
CREATE TABLE `trade_evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`direction` text NOT NULL,
	`timeframe` text NOT NULL,
	`entry_price` real NOT NULL,
	`stop_loss` real NOT NULL,
	`targets_json` text NOT NULL,
	`composite_score` real,
	`signal` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rr_ratio` real,
	`position_size` real,
	`position_cost` real,
	`vehicle` text DEFAULT 'shares',
	`ira_eligible` integer DEFAULT 1,
	`confirmed_at` text,
	`passed_at` text,
	`pass_reason` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_evaluations_asset_id` ON `trade_evaluations` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_evaluations_status` ON `trade_evaluations` (`status`);--> statement-breakpoint
CREATE TABLE `trade_outcomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evaluation_id` integer NOT NULL,
	`actual_entry` real NOT NULL,
	`actual_exit` real NOT NULL,
	`pnl` real NOT NULL,
	`notes` text,
	`closed_at` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`evaluation_id`) REFERENCES `trade_evaluations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trade_outcomes_evaluation_id_unique` ON `trade_outcomes` (`evaluation_id`);