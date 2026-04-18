import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, bigint } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Unique identifier per user — for local auth this is derived from email. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * AI Models table - stores information about available AI models
 */
export const aiModels = mysqlTable("aiModels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  provider: mysqlEnum("provider", ["OpenAI", "Anthropic", "Google Gemini", "Mistral", "Meta LLaMA"]).notNull(),
  description: text("description"),
  modelId: varchar("modelId", { length: 255 }).notNull().unique(),
  capabilities: text("capabilities"), // JSON array: ["chat", "completion", "embedding", etc]
  maxTokens: int("maxTokens"),
  costPer1kTokens: decimal("costPer1kTokens", { precision: 10, scale: 6 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = typeof aiModels.$inferInsert;

/**
 * API Keys table - stores user API keys for gateway access
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 20 }).notNull(), // First 8 chars for display
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  rateLimit: int("rateLimit").default(1000), // requests per minute
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Usage Metrics table - tracks API usage per key
 */
export const usageMetrics = mysqlTable("usageMetrics", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  modelId: int("modelId").notNull(),
  requestCount: int("requestCount").default(0).notNull(),
  promptTokens: bigint("promptTokens", { mode: "number" }).default(0).notNull(),
  completionTokens: bigint("completionTokens", { mode: "number" }).default(0).notNull(),
  totalTokens: bigint("totalTokens", { mode: "number" }).default(0).notNull(),
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 6 }).default("0"),
  responseTimeMs: int("responseTimeMs"),
  statusCode: int("statusCode"),
  errorMessage: text("errorMessage"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

/**
 * Admin Logs table - audit trail for admin actions
 */
export const adminLogs = mysqlTable("adminLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  action: varchar("action", { length: 255 }).notNull(), // e.g., "suspend_user", "revoke_key", "view_metrics"
  targetUserId: int("targetUserId"),
  targetKeyId: int("targetKeyId"),
  details: text("details"), // JSON object with action details
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

/**
 * Provider Configs table - stores API credentials for each provider
 */
export const providerConfigs = mysqlTable("providerConfigs", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["OpenAI", "Anthropic", "Google Gemini", "Mistral", "Meta LLaMA"]).notNull().unique(),
  apiKey: varchar("apiKey", { length: 1024 }).notNull(),
  baseUrl: varchar("baseUrl", { length: 512 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type InsertProviderConfig = typeof providerConfigs.$inferInsert;

/**
 * Relations
 */
export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  adminLogs: many(adminLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  usageMetrics: many(usageMetrics),
}));

export const usageMetricsRelations = relations(usageMetrics, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [usageMetrics.apiKeyId],
    references: [apiKeys.id],
  }),
  model: one(aiModels, {
    fields: [usageMetrics.modelId],
    references: [aiModels.id],
  }),
}));

export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminLogs.adminId],
    references: [users.id],
  }),
}));
