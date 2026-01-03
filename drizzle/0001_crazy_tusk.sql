CREATE TABLE `detections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serialId` int NOT NULL,
	`sourceUrl` varchar(2048) NOT NULL,
	`pageTitle` varchar(512),
	`snippet` text,
	`status` enum('new','processed','ignored') NOT NULL DEFAULT 'new',
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `detections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ncc_serials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`serialNumber` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastScanAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ncc_serials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serialId` int NOT NULL,
	`scanType` enum('manual','auto') NOT NULL DEFAULT 'manual',
	`resultsCount` int NOT NULL DEFAULT 0,
	`newDetections` int NOT NULL DEFAULT 0,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`)
);
