import { eq, and, desc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import {
  InsertUser, users, apiKeys, usageMetrics,
  aiModels, adminLogs, providerConfigs,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import crypto from "crypto";

// ─── DB initialisation ───────────────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    ensureDir(DB_PATH);
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");   // better concurrency
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite);
    runMigrations(sqlite);
  }
  return _db;
}

// ─── Auto-migration (run CREATE TABLE IF NOT EXISTS on startup) ───────────────

function runMigrations(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id"           INTEGER PRIMARY KEY AUTOINCREMENT,
      "openId"       TEXT    NOT NULL UNIQUE,
      "name"         TEXT,
      "email"        TEXT    UNIQUE,
      "passwordHash" TEXT,
      "loginMethod"  TEXT,
      "role"         TEXT    NOT NULL DEFAULT 'user',
      "createdAt"    TEXT    NOT NULL DEFAULT (datetime('now')),
      "updatedAt"    TEXT    NOT NULL DEFAULT (datetime('now')),
      "lastSignedIn" TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "aiModels" (
      "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
      "name"            TEXT    NOT NULL,
      "provider"        TEXT    NOT NULL,
      "description"     TEXT,
      "modelId"         TEXT    NOT NULL UNIQUE,
      "capabilities"    TEXT,
      "maxTokens"       INTEGER,
      "costPer1kTokens" REAL,
      "isActive"        INTEGER NOT NULL DEFAULT 1,
      "createdAt"       TEXT    NOT NULL DEFAULT (datetime('now')),
      "updatedAt"       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "apiKeys" (
      "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
      "userId"        INTEGER NOT NULL,
      "keyHash"       TEXT    NOT NULL UNIQUE,
      "keyPrefix"     TEXT    NOT NULL,
      "name"          TEXT    NOT NULL,
      "description"   TEXT,
      "isActive"      INTEGER NOT NULL DEFAULT 1,
      "rateLimit"     INTEGER DEFAULT 1000,
      "allowedModels" TEXT,
      "lastUsedAt"    TEXT,
      "createdAt"     TEXT    NOT NULL DEFAULT (datetime('now')),
      "updatedAt"     TEXT    NOT NULL DEFAULT (datetime('now')),
      "revokedAt"     TEXT
    );

    CREATE TABLE IF NOT EXISTS "usageMetrics" (
      "id"               INTEGER PRIMARY KEY AUTOINCREMENT,
      "apiKeyId"         INTEGER NOT NULL,
      "modelId"          INTEGER NOT NULL,
      "requestCount"     INTEGER NOT NULL DEFAULT 0,
      "promptTokens"     INTEGER NOT NULL DEFAULT 0,
      "completionTokens" INTEGER NOT NULL DEFAULT 0,
      "totalTokens"      INTEGER NOT NULL DEFAULT 0,
      "estimatedCost"    REAL    DEFAULT 0,
      "responseTimeMs"   INTEGER,
      "statusCode"       INTEGER,
      "errorMessage"     TEXT,
      "date"             TEXT    NOT NULL DEFAULT (datetime('now')),
      "createdAt"        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "adminLogs" (
      "id"           INTEGER PRIMARY KEY AUTOINCREMENT,
      "adminId"      INTEGER NOT NULL,
      "action"       TEXT    NOT NULL,
      "targetUserId" INTEGER,
      "targetKeyId"  INTEGER,
      "details"      TEXT,
      "ipAddress"    TEXT,
      "userAgent"    TEXT,
      "createdAt"    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "providerConfigs" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "provider"  TEXT    NOT NULL UNIQUE,
      "apiKey"    TEXT    NOT NULL,
      "baseUrl"   TEXT,
      "isActive"  INTEGER NOT NULL DEFAULT 1,
      "createdAt" TEXT    NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Non-destructive migrations for existing databases
  try { sqlite.exec(`ALTER TABLE "apiKeys" ADD COLUMN "allowedModels" TEXT`); } catch {}
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("openId is required");
  const db = getDb();
  const now = new Date().toISOString();

  const updateSet: Record<string, unknown> = { updatedAt: now };
  if (user.name         !== undefined) updateSet.name         = user.name ?? null;
  if (user.email        !== undefined) updateSet.email        = user.email ?? null;
  if (user.loginMethod  !== undefined) updateSet.loginMethod  = user.loginMethod ?? null;
  if (user.passwordHash !== undefined) updateSet.passwordHash = user.passwordHash ?? null;
  if (user.lastSignedIn !== undefined) {
    updateSet.lastSignedIn = user.lastSignedIn instanceof Date
      ? user.lastSignedIn.toISOString()
      : user.lastSignedIn;
  }
  if (user.role         !== undefined) updateSet.role         = user.role;

  const isAdmin = user.openId === `local:${ENV.adminEmail}` && ENV.adminEmail;
  if (isAdmin && !user.role) updateSet.role = "admin";

  await db.insert(users)
    .values({
      openId:       user.openId,
      name:         (user.name ?? null) as any,
      email:        (user.email ?? null) as any,
      loginMethod:  (user.loginMethod ?? "email") as any,
      passwordHash: (user.passwordHash ?? null) as any,
      role:         ((updateSet.role ?? user.role ?? "user") as any),
      lastSignedIn: (updateSet.lastSignedIn ?? now) as any,
      createdAt:    now,
      updatedAt:    now,
    })
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = getDb();
  const result = db.select().from(users).where(eq(users.openId, openId)).limit(1).all();
  return result[0] ?? undefined;
}

export async function getUserById(id: number) {
  const db = getDb();
  const result = db.select().from(users).where(eq(users.id, id)).limit(1).all();
  return result[0] ?? undefined;
}

export async function getUserByEmail(email: string) {
  const db = getDb();
  const result = db.select().from(users).where(eq(users.email, email)).limit(1).all();
  return result[0] ?? undefined;
}

export async function createUserWithPassword(
  name: string, email: string, passwordHash: string, role: "user" | "admin" = "user"
) {
  const db = getDb();
  const openId    = `local:${email}`;
  const finalRole = (ENV.adminEmail && email === ENV.adminEmail) ? "admin" : role;
  const now       = new Date().toISOString();
  db.insert(users).values({
    openId, name, email, passwordHash,
    loginMethod: "email", role: finalRole,
    lastSignedIn: now, createdAt: now, updatedAt: now,
  } as any).run();
  return getUserByEmail(email);
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export function generateApiKey()           { return `gw_${crypto.randomBytes(32).toString("hex")}`; }
export function hashApiKey(key: string)    { return crypto.createHash("sha256").update(key).digest("hex"); }
export function getKeyPrefix(key: string)  { return key.substring(0, 12); }

export async function createApiKey(
  userId: number, name: string, description?: string,
  rateLimit = 1000, allowedModels?: number[]
) {
  const db     = getDb();
  const key    = generateApiKey();
  const now    = new Date().toISOString();
  const result = db.insert(apiKeys).values({
    userId, name,
    keyHash:       hashApiKey(key),
    keyPrefix:     getKeyPrefix(key),
    description:   description ?? null,
    rateLimit,
    allowedModels: allowedModels && allowedModels.length > 0
      ? JSON.stringify(allowedModels)
      : null,
    isActive: true,
    createdAt: now, updatedAt: now,
  } as any).returning({ id: apiKeys.id }).all();
  return { id: result[0].id, key, keyPrefix: getKeyPrefix(key) };
}

export async function getUserApiKeys(userId: number) {
  const db = getDb();
  return db.select().from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)))
    .orderBy(desc(apiKeys.createdAt)).all();
}

export async function getApiKeyByHash(keyHash: string) {
  const db     = getDb();
  const result = db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1).all();
  return result[0] ?? undefined;
}

export async function revokeApiKey(keyId: number, userId: number) {
  const db  = getDb();
  const now = new Date().toISOString();
  db.update(apiKeys)
    .set({ isActive: false, revokedAt: now, updatedAt: now })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId))).run();
}

export async function updateApiKeyLastUsed(keyId: number) {
  const db = getDb();
  db.update(apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiKeys.id, keyId)).run();
}

// ─── Usage ────────────────────────────────────────────────────────────────────

export async function recordUsage(data: {
  apiKeyId: number; modelId: number; requestCount?: number;
  promptTokens?: number; completionTokens?: number; totalTokens?: number;
  estimatedCost?: number; responseTimeMs?: number; statusCode?: number; errorMessage?: string;
}) {
  const db  = getDb();
  const now = new Date().toISOString();
  db.insert(usageMetrics).values({
    apiKeyId:         data.apiKeyId,
    modelId:          data.modelId,
    requestCount:     data.requestCount     ?? 1,
    promptTokens:     data.promptTokens     ?? 0,
    completionTokens: data.completionTokens ?? 0,
    totalTokens:      data.totalTokens      ?? 0,
    estimatedCost:    data.estimatedCost    ?? 0,
    responseTimeMs:   data.responseTimeMs   ?? null,
    statusCode:       data.statusCode       ?? 200,
    errorMessage:     data.errorMessage     ?? null,
    date: now, createdAt: now,
  } as any).run();
}

export async function getKeyUsageMetrics(apiKeyId: number, days = 30) {
  const db    = getDb();
  const since = new Date(Date.now() - days * 864e5).toISOString();
  return db.select().from(usageMetrics)
    .where(and(eq(usageMetrics.apiKeyId, apiKeyId), gte(usageMetrics.createdAt, since)))
    .orderBy(desc(usageMetrics.createdAt)).all();
}

export async function getDailyUsageSummary(apiKeyId: number, days = 30) {
  const db    = getDb();
  const since = new Date(Date.now() - days * 864e5).toISOString();
  return db.select().from(usageMetrics)
    .where(and(eq(usageMetrics.apiKeyId, apiKeyId), gte(usageMetrics.createdAt, since)))
    .orderBy(desc(usageMetrics.date)).all();
}

// ─── Models ───────────────────────────────────────────────────────────────────

export async function getActiveModels() {
  return getDb().select().from(aiModels).where(eq(aiModels.isActive, true)).all();
}

export async function getModelsByProvider(provider: string) {
  return getDb().select().from(aiModels).where(eq(aiModels.provider, provider as any)).all();
}

export async function getModelById(modelId: number) {
  const result = getDb().select().from(aiModels).where(eq(aiModels.id, modelId)).limit(1).all();
  return result[0] ?? undefined;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAllUsers(limit = 100, offset = 0) {
  return getDb().select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset).all();
}

export async function getAllApiKeys(limit = 100, offset = 0) {
  return getDb().select().from(apiKeys).orderBy(desc(apiKeys.createdAt)).limit(limit).offset(offset).all();
}

export async function logAdminAction(
  adminId: number, action: string,
  targetUserId?: number, targetKeyId?: number, details?: Record<string, unknown>
) {
  const db  = getDb();
  const now = new Date().toISOString();
  db.insert(adminLogs).values({
    adminId, action,
    targetUserId: targetUserId ?? null,
    targetKeyId:  targetKeyId  ?? null,
    details:      details ? JSON.stringify(details) : null,
    createdAt: now,
  } as any).run();
}

export async function getAdminLogs(limit = 100, offset = 0) {
  return getDb().select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit).offset(offset).all();
}

export async function getPlatformUsageStats(days = 30) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  return getDb().select().from(usageMetrics)
    .where(gte(usageMetrics.createdAt, since))
    .orderBy(desc(usageMetrics.createdAt)).all();
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedModelsIfEmpty() {
  const db = getDb();
  const existing = db.select().from(aiModels).limit(1).all();
  if (existing.length > 0) return; // already seeded

  const now = new Date().toISOString();
  const models = [
    // OpenAI
    { name: "GPT-4o",             provider: "OpenAI",        modelId: "gpt-4o",             maxTokens: 128000, costPer1kTokens: 0.0025,  description: "Most capable GPT-4 model, multimodal" },
    { name: "GPT-4o Mini",        provider: "OpenAI",        modelId: "gpt-4o-mini",         maxTokens: 128000, costPer1kTokens: 0.00015, description: "Fast and affordable GPT-4 class model" },
    { name: "GPT-4 Turbo",        provider: "OpenAI",        modelId: "gpt-4-turbo",         maxTokens: 128000, costPer1kTokens: 0.01,    description: "High-capability GPT-4 with large context" },
    { name: "GPT-3.5 Turbo",      provider: "OpenAI",        modelId: "gpt-3.5-turbo",       maxTokens: 16385,  costPer1kTokens: 0.0005,  description: "Fast and cost-effective model" },
    // Anthropic
    { name: "Claude 3.5 Sonnet",  provider: "Anthropic",     modelId: "claude-3-5-sonnet",   maxTokens: 200000, costPer1kTokens: 0.003,   description: "Most intelligent Claude model" },
    { name: "Claude 3 Opus",      provider: "Anthropic",     modelId: "claude-3-opus",       maxTokens: 200000, costPer1kTokens: 0.015,   description: "Powerful model for complex tasks" },
    { name: "Claude 3 Haiku",     provider: "Anthropic",     modelId: "claude-3-haiku",      maxTokens: 200000, costPer1kTokens: 0.00025, description: "Fastest and most compact Claude model" },
    // Google
    { name: "Gemini 1.5 Pro",     provider: "Google Gemini", modelId: "gemini-1.5-pro",      maxTokens: 1000000,costPer1kTokens: 0.00125, description: "Best performing Gemini model" },
    { name: "Gemini 1.5 Flash",   provider: "Google Gemini", modelId: "gemini-1.5-flash",    maxTokens: 1000000,costPer1kTokens: 0.000075,description: "Fast and versatile multimodal model" },
    // Mistral
    { name: "Mistral Large",      provider: "Mistral",       modelId: "mistral-large",       maxTokens: 32000,  costPer1kTokens: 0.002,   description: "Top-tier Mistral reasoning model" },
    { name: "Mistral 7B",         provider: "Mistral",       modelId: "mistral-7b",          maxTokens: 32000,  costPer1kTokens: 0.00025, description: "Efficient open-weight model" },
    // Meta / Groq
    { name: "LLaMA 3 70B",        provider: "Meta LLaMA",    modelId: "llama-3-70b",         maxTokens: 8192,   costPer1kTokens: 0.00059, description: "Powerful open-source LLaMA 3 model via Groq" },
    { name: "LLaMA 3 8B",         provider: "Meta LLaMA",    modelId: "llama-3-8b",          maxTokens: 8192,   costPer1kTokens: 0.00005, description: "Fast lightweight LLaMA 3 model via Groq" },
  ];

  for (const m of models) {
    try {
      db.insert(aiModels).values({
        ...m,
        capabilities: JSON.stringify(["chat", "completion"]),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as any).run();
    } catch {
      // skip duplicates
    }
  }
  console.log(`[DB] Seeded ${models.length} models`);
}
