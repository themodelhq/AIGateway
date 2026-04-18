import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id:           integer("id").primaryKey({ autoIncrement: true }),
  openId:       text("openId").notNull().unique(),
  name:         text("name"),
  email:        text("email").unique(),
  passwordHash: text("passwordHash"),
  loginMethod:  text("loginMethod"),
  role:         text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt:    text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt:    text("updatedAt").notNull().default(sql`(datetime('now'))`),
  lastSignedIn: text("lastSignedIn").notNull().default(sql`(datetime('now'))`),
});

export type User     = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── AI Models ────────────────────────────────────────────────────────────────
export const aiModels = sqliteTable("aiModels", {
  id:              integer("id").primaryKey({ autoIncrement: true }),
  name:            text("name").notNull(),
  provider:        text("provider", { enum: ["OpenAI", "Anthropic", "Google Gemini", "Mistral", "Meta LLaMA"] }).notNull(),
  description:     text("description"),
  modelId:         text("modelId").notNull().unique(),
  capabilities:    text("capabilities"),
  maxTokens:       integer("maxTokens"),
  costPer1kTokens: real("costPer1kTokens"),
  isActive:        integer("isActive", { mode: "boolean" }).notNull().default(true),
  createdAt:       text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt:       text("updatedAt").notNull().default(sql`(datetime('now'))`),
});

export type AiModel     = typeof aiModels.$inferSelect;
export type InsertAiModel = typeof aiModels.$inferInsert;

// ─── API Keys ─────────────────────────────────────────────────────────────────
export const apiKeys = sqliteTable("apiKeys", {
  id:            integer("id").primaryKey({ autoIncrement: true }),
  userId:        integer("userId").notNull(),
  keyHash:       text("keyHash").notNull().unique(),
  keyPrefix:     text("keyPrefix").notNull(),
  name:          text("name").notNull(),
  description:   text("description"),
  isActive:      integer("isActive", { mode: "boolean" }).notNull().default(true),
  rateLimit:     integer("rateLimit").default(1000),
  allowedModels: text("allowedModels"), // JSON array of model IDs, null = all models
  lastUsedAt:    text("lastUsedAt"),
  createdAt:     text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt:     text("updatedAt").notNull().default(sql`(datetime('now'))`),
  revokedAt:     text("revokedAt"),
});

export type ApiKey     = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── Usage Metrics ────────────────────────────────────────────────────────────
export const usageMetrics = sqliteTable("usageMetrics", {
  id:               integer("id").primaryKey({ autoIncrement: true }),
  apiKeyId:         integer("apiKeyId").notNull(),
  modelId:          integer("modelId").notNull(),
  requestCount:     integer("requestCount").notNull().default(0),
  promptTokens:     integer("promptTokens").notNull().default(0),
  completionTokens: integer("completionTokens").notNull().default(0),
  totalTokens:      integer("totalTokens").notNull().default(0),
  estimatedCost:    real("estimatedCost").default(0),
  responseTimeMs:   integer("responseTimeMs"),
  statusCode:       integer("statusCode"),
  errorMessage:     text("errorMessage"),
  date:             text("date").notNull().default(sql`(datetime('now'))`),
  createdAt:        text("createdAt").notNull().default(sql`(datetime('now'))`),
});

export type UsageMetric     = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

// ─── Admin Logs ───────────────────────────────────────────────────────────────
export const adminLogs = sqliteTable("adminLogs", {
  id:           integer("id").primaryKey({ autoIncrement: true }),
  adminId:      integer("adminId").notNull(),
  action:       text("action").notNull(),
  targetUserId: integer("targetUserId"),
  targetKeyId:  integer("targetKeyId"),
  details:      text("details"),
  ipAddress:    text("ipAddress"),
  userAgent:    text("userAgent"),
  createdAt:    text("createdAt").notNull().default(sql`(datetime('now'))`),
});

export type AdminLog     = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

// ─── Provider Configs ─────────────────────────────────────────────────────────
export const providerConfigs = sqliteTable("providerConfigs", {
  id:        integer("id").primaryKey({ autoIncrement: true }),
  provider:  text("provider", { enum: ["OpenAI", "Anthropic", "Google Gemini", "Mistral", "Meta LLaMA"] }).notNull().unique(),
  apiKey:    text("apiKey").notNull(),
  baseUrl:   text("baseUrl"),
  isActive:  integer("isActive", { mode: "boolean" }).notNull().default(true),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
});

export type ProviderConfig     = typeof providerConfigs.$inferSelect;
export type InsertProviderConfig = typeof providerConfigs.$inferInsert;

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  apiKeys:   many(apiKeys),
  adminLogs: many(adminLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user:         one(users,   { fields: [apiKeys.userId], references: [users.id] }),
  usageMetrics: many(usageMetrics),
}));

export const usageMetricsRelations = relations(usageMetrics, ({ one }) => ({
  apiKey: one(apiKeys,   { fields: [usageMetrics.apiKeyId], references: [apiKeys.id] }),
  model:  one(aiModels,  { fields: [usageMetrics.modelId],  references: [aiModels.id] }),
}));

export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(users, { fields: [adminLogs.adminId], references: [users.id] }),
}));
