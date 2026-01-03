ALTER TABLE `scan_logs` MODIFY COLUMN `scanType` enum('manual','auto','shopee') NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `detections` ADD `sourceType` enum('general','shopee') DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `detections` ADD `isShopee` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `detections` ADD `shopeeShopId` varchar(64);--> statement-breakpoint
ALTER TABLE `detections` ADD `shopeeProductId` varchar(64);--> statement-breakpoint
ALTER TABLE `detections` ADD `shopeeShopName` varchar(255);--> statement-breakpoint
ALTER TABLE `ncc_serials` ADD `lastShopeeScanAt` timestamp;--> statement-breakpoint
ALTER TABLE `scan_logs` ADD `shopeeDetections` int DEFAULT 0 NOT NULL;