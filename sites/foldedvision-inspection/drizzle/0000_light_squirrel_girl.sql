CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`scope` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entity` ON `audit` (`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `app_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`lot_id` text NOT NULL,
	`item_ref` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`ai_status` text DEFAULT 'NOT_RUN' NOT NULL,
	`ai_type` text,
	`ai_score` real,
	`ai_model` text,
	`ai_payload` text,
	`final_status` text DEFAULT 'PENDING' NOT NULL,
	`final_note` text DEFAULT '' NOT NULL,
	`decided_by` text,
	`decided_at` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`decision_token` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inspection_lot_item` ON `inspections` (`lot_id`,`item_ref`);--> statement-breakpoint
CREATE INDEX `inspection_queue` ON `inspections` (`final_status`,`created_at`);--> statement-breakpoint
CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`scope` text DEFAULT 'live' NOT NULL,
	`supplier` text NOT NULL,
	`part_type` text NOT NULL,
	`part_number` text NOT NULL,
	`quantity` integer NOT NULL,
	`received_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lots_scope_code` ON `lots` (`scope`,`code`);--> statement-breakpoint
CREATE INDEX `lots_received` ON `lots` (`scope`,`received_date`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`inspection_id` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`params` text NOT NULL,
	`result` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'inspector' NOT NULL,
	`created_at` text NOT NULL
);
