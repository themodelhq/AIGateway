import { eq, and, desc, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, apiKeys, usageMetrics, aiModels, adminLogs, providerConfigs } from "../drizzle/schema";
import { ENV } from './_core/env';
import crypto from 'crypto';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === `local:${ENV.adminEmail}` && ENV.adminEmail) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(
  name: string,
  email: string,
  passwordHash: string,
  role: "user" | "admin" = "user"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local:${email}`;
  await db.insert(users).values({
    openId,
    name,
    email,
    passwordHash,
    loginMethod: "email",
    role,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(email);
}


/**
 * API Key Management Functions
 */

// Generate a secure API key
export function generateApiKey(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

// Hash an API key for storage
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Get key prefix for display (first 8 chars after sk_)
export function getKeyPrefix(key: string): string {
  return key.substring(0, 12); // sk_ + 8 chars
}

// Create a new API key for a user
export async function createApiKey(
  userId: number,
  name: string,
  description?: string,
  rateLimit: number = 1000
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);

  const result = await db.insert(apiKeys).values({
    userId,
    keyHash,
    keyPrefix,
    name,
    description,
    rateLimit,
    isActive: true,
  });

  return {
    id: result[0].insertId as number,
    key: rawKey, // Only return the raw key once
    keyPrefix,
  };
}

// Get user's API keys (without the actual key)
export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: apiKeys.id,
    keyPrefix: apiKeys.keyPrefix,
    name: apiKeys.name,
    description: apiKeys.description,
    isActive: apiKeys.isActive,
    rateLimit: apiKeys.rateLimit,
    lastUsedAt: apiKeys.lastUsedAt,
    createdAt: apiKeys.createdAt,
    revokedAt: apiKeys.revokedAt,
  })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

// Get API key by hash (for validation)
export async function getApiKeyByHash(keyHash: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Revoke an API key
export async function revokeApiKey(keyId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(apiKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
    })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
}

// Update API key last used time
export async function updateApiKeyLastUsed(keyId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyId));
}

/**
 * Usage Metrics Functions
 */

// Record a request
export async function recordUsage(
  apiKeyId: number,
  modelId: number,
  promptTokens: number,
  completionTokens: number,
  responseTimeMs: number,
  statusCode: number,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;

  const totalTokens = promptTokens + completionTokens;

  await db.insert(usageMetrics).values({
    apiKeyId,
    modelId,
    requestCount: 1,
    promptTokens,
    completionTokens,
    totalTokens,
    responseTimeMs,
    statusCode,
    errorMessage,
  });
}

// Get usage metrics for a key
export async function getKeyUsageMetrics(apiKeyId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db.select({
    modelId: usageMetrics.modelId,
    modelName: aiModels.name,
    provider: aiModels.provider,
    requestCount: usageMetrics.requestCount,
    totalTokens: usageMetrics.totalTokens,
    promptTokens: usageMetrics.promptTokens,
    completionTokens: usageMetrics.completionTokens,
    estimatedCost: usageMetrics.estimatedCost,
    date: usageMetrics.date,
  })
    .from(usageMetrics)
    .innerJoin(aiModels, eq(usageMetrics.modelId, aiModels.id))
    .where(and(
      eq(usageMetrics.apiKeyId, apiKeyId),
      gte(usageMetrics.date, startDate)
    ))
    .orderBy(desc(usageMetrics.date));
}

// Get daily usage summary
export async function getDailyUsageSummary(apiKeyId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db.select({
    date: usageMetrics.date,
    requestCount: usageMetrics.requestCount,
    totalTokens: usageMetrics.totalTokens,
  })
    .from(usageMetrics)
    .where(and(
      eq(usageMetrics.apiKeyId, apiKeyId),
      gte(usageMetrics.date, startDate)
    ))
    .orderBy(desc(usageMetrics.date));
}

/**
 * AI Models Functions
 */

// Get all active models
export async function getActiveModels() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiModels).where(eq(aiModels.isActive, true));
}

// Get models by provider
export async function getModelsByProvider(provider: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiModels).where(
    and(eq(aiModels.provider, provider as any), eq(aiModels.isActive, true))
  );
}

// Get model by ID
export async function getModelById(modelId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Admin Functions
 */

// Get all users (admin only)
export async function getAllUsers(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

// Get all API keys (admin only)
export async function getAllApiKeys(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: apiKeys.id,
    userId: apiKeys.userId,
    keyPrefix: apiKeys.keyPrefix,
    name: apiKeys.name,
    isActive: apiKeys.isActive,
    lastUsedAt: apiKeys.lastUsedAt,
    createdAt: apiKeys.createdAt,
    revokedAt: apiKeys.revokedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .orderBy(desc(apiKeys.createdAt))
    .limit(limit)
    .offset(offset);
}

// Log admin action
export async function logAdminAction(
  adminId: number,
  action: string,
  targetUserId?: number,
  targetKeyId?: number,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(adminLogs).values({
    adminId,
    action,
    targetUserId,
    targetKeyId,
    details: details ? JSON.stringify(details) : undefined,
    ipAddress,
    userAgent,
  });
}

// Get admin logs
export async function getAdminLogs(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: adminLogs.id,
    adminId: adminLogs.adminId,
    adminName: users.name,
    action: adminLogs.action,
    targetUserId: adminLogs.targetUserId,
    targetKeyId: adminLogs.targetKeyId,
    createdAt: adminLogs.createdAt,
  })
    .from(adminLogs)
    .leftJoin(users, eq(adminLogs.adminId, users.id))
    .orderBy(desc(adminLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

// Get platform-wide usage statistics
export async function getPlatformUsageStats(days: number = 30) {
  const db = await getDb();
  if (!db) return null;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db.select({
    totalRequests: usageMetrics.requestCount,
    totalTokens: usageMetrics.totalTokens,
  })
    .from(usageMetrics)
    .where(gte(usageMetrics.date, startDate));

  return {
    totalRequests: result.reduce((sum, r) => sum + (r.totalRequests || 0), 0),
    totalTokens: result.reduce((sum, r) => sum + (r.totalTokens || 0), 0),
  };
}
