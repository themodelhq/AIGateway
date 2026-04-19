-- AI Gateway Platform — PostgreSQL schema
-- Run this in Supabase: Dashboard → SQL Editor → paste & run

-- Enums
DO $$ BEGIN
  CREATE TYPE "role" AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "provider" AS ENUM ('OpenAI', 'Anthropic', 'Google Gemini', 'Mistral', 'Meta LLaMA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS "users" (
  "id"           SERIAL PRIMARY KEY,
  "openId"       VARCHAR(64)  NOT NULL UNIQUE,
  "name"         TEXT,
  "email"        VARCHAR(320) UNIQUE,
  "passwordHash" VARCHAR(255),
  "loginMethod"  VARCHAR(64),
  "role"         "role"       NOT NULL DEFAULT 'user',
  "createdAt"    TIMESTAMP    NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP    NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- AI Models
CREATE TABLE IF NOT EXISTS "aiModels" (
  "id"              SERIAL PRIMARY KEY,
  "name"            VARCHAR(255) NOT NULL,
  "provider"        "provider"   NOT NULL,
  "description"     TEXT,
  "modelId"         VARCHAR(255) NOT NULL UNIQUE,
  "capabilities"    TEXT,
  "maxTokens"       INTEGER,
  "costPer1kTokens" NUMERIC(10,6),
  "isActive"        BOOLEAN      NOT NULL DEFAULT TRUE,
  "createdAt"       TIMESTAMP    NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS "apiKeys" (
  "id"          SERIAL PRIMARY KEY,
  "userId"      INTEGER      NOT NULL,
  "keyHash"     VARCHAR(255) NOT NULL UNIQUE,
  "keyPrefix"   VARCHAR(20)  NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "isActive"    BOOLEAN      NOT NULL DEFAULT TRUE,
  "rateLimit"   INTEGER               DEFAULT 1000,
  "lastUsedAt"  TIMESTAMP,
  "createdAt"   TIMESTAMP    NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP    NOT NULL DEFAULT NOW(),
  "revokedAt"   TIMESTAMP
);

-- Usage Metrics
CREATE TABLE IF NOT EXISTS "usageMetrics" (
  "id"               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "apiKeyId"         INTEGER      NOT NULL,
  "modelId"          INTEGER      NOT NULL,
  "requestCount"     INTEGER      NOT NULL DEFAULT 0,
  "promptTokens"     BIGINT       NOT NULL DEFAULT 0,
  "completionTokens" BIGINT       NOT NULL DEFAULT 0,
  "totalTokens"      BIGINT       NOT NULL DEFAULT 0,
  "estimatedCost"    NUMERIC(12,6)         DEFAULT '0',
  "responseTimeMs"   INTEGER,
  "statusCode"       INTEGER,
  "errorMessage"     TEXT,
  "date"             TIMESTAMP    NOT NULL DEFAULT NOW(),
  "createdAt"        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Admin Logs
CREATE TABLE IF NOT EXISTS "adminLogs" (
  "id"           SERIAL PRIMARY KEY,
  "adminId"      INTEGER      NOT NULL,
  "action"       VARCHAR(255) NOT NULL,
  "targetUserId" INTEGER,
  "targetKeyId"  INTEGER,
  "details"      TEXT,
  "ipAddress"    VARCHAR(45),
  "userAgent"    TEXT,
  "createdAt"    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Provider Configs
CREATE TABLE IF NOT EXISTS "providerConfigs" (
  "id"        SERIAL PRIMARY KEY,
  "provider"  "provider"    NOT NULL UNIQUE,
  "apiKey"    VARCHAR(1024) NOT NULL,
  "baseUrl"   VARCHAR(512),
  "isActive"  BOOLEAN       NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP     NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP     NOT NULL DEFAULT NOW()
);
