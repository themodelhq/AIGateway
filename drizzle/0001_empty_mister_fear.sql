CREATE TABLE `adminLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`targetUserId` int,
	`targetKeyId` int,
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiModels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` enum('OpenAI','Anthropic','Google Gemini','Mistral','Meta LLaMA') NOT NULL,
	`description` text,
	`modelId` varchar(255) NOT NULL,
	`capabilities` text,
	`maxTokens` int,
	`costPer1kTokens` decimal(10,6),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiModels_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiModels_modelId_unique` UNIQUE(`modelId`)
);
--> statement-breakpoint
CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyHash` varchar(255) NOT NULL,
	`keyPrefix` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`rateLimit` int DEFAULT 1000,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`revokedAt` timestamp,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiKeys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `providerConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('OpenAI','Anthropic','Google Gemini','Mistral','Meta LLaMA') NOT NULL,
	`apiKey` varchar(1024) NOT NULL,
	`baseUrl` varchar(512),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providerConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `providerConfigs_provider_unique` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE TABLE `usageMetrics` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`apiKeyId` int NOT NULL,
	`modelId` int NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`promptTokens` bigint NOT NULL DEFAULT 0,
	`completionTokens` bigint NOT NULL DEFAULT 0,
	`totalTokens` bigint NOT NULL DEFAULT 0,
	`estimatedCost` decimal(12,6) DEFAULT '0',
	`responseTimeMs` int,
	`statusCode` int,
	`errorMessage` text,
	`date` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usageMetrics_id` PRIMARY KEY(`id`)
);
