import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createApiKey,
  getUserApiKeys,
  getApiKeyByHash,
  revokeApiKey,
  getActiveModels,
  getModelsByProvider,
  getAllUsers,
  getAllApiKeys,
  logAdminAction,
  getAdminLogs,
  getPlatformUsageStats,
  getKeyUsageMetrics,
  getDailyUsageSummary,
  hashApiKey,
  recordUsage,
} from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * API Key Management
   */
  apiKeys: router({
    // Create a new API key
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        rateLimit: z.number().int().positive().default(1000),
        allowedModels: z.array(z.number().int()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await createApiKey(
            ctx.user.id,
            input.name,
            input.description,
            input.rateLimit,
            input.allowedModels,
          );

          // Log the action
          await logAdminAction(
            ctx.user.id,
            'create_api_key',
            ctx.user.id,
            result.id,
            { keyName: input.name }
          );

          return {
            id: result.id,
            key: result.key,
            keyPrefix: result.keyPrefix,
            message: 'API key created. Save it securely - you won\'t be able to see it again!',
          };
        } catch (error) {
          console.error('Failed to create API key:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create API key' });
        }
      }),

    // List user's API keys
    list: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          return await getUserApiKeys(ctx.user.id);
        } catch (error) {
          console.error('Failed to list API keys:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list API keys' });
        }
      }),

    // Revoke an API key
    revoke: protectedProcedure
      .input(z.object({
        keyId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          await revokeApiKey(input.keyId, ctx.user.id);

          // Log the action
          await logAdminAction(
            ctx.user.id,
            'revoke_api_key',
            ctx.user.id,
            input.keyId
          );

          return { success: true };
        } catch (error) {
          console.error('Failed to revoke API key:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to revoke API key' });
        }
      }),

    // Validate an API key (used by gateway)
    validate: publicProcedure
      .input(z.object({
        key: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const keyHash = hashApiKey(input.key);
          const apiKey = await getApiKeyByHash(keyHash);

          if (!apiKey || !apiKey.isActive || apiKey.revokedAt) {
            return { valid: false };
          }

          return {
            valid: true,
            keyId: apiKey.id,
            userId: apiKey.userId,
            rateLimit: apiKey.rateLimit,
          };
        } catch (error) {
          console.error('Failed to validate API key:', error);
          return { valid: false };
        }
      }),
  }),

  /**
   * Models
   */
  models: router({
    // Get all active models
    list: publicProcedure
      .query(async () => {
        try {
          return await getActiveModels();
        } catch (error) {
          console.error('Failed to list models:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list models' });
        }
      }),

    // Get models by provider
    byProvider: publicProcedure
      .input(z.object({
        provider: z.enum(['OpenAI', 'Anthropic', 'Google Gemini', 'Mistral', 'Meta LLaMA']),
      }))
      .query(async ({ input }) => {
        try {
          return await getModelsByProvider(input.provider);
        } catch (error) {
          console.error('Failed to get models by provider:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get models' });
        }
      }),
  }),

  /**
   * Usage Analytics
   */
  usage: router({
    // Get usage metrics for a key
    metrics: protectedProcedure
      .input(z.object({
        keyId: z.number().int().positive(),
        days: z.number().int().positive().default(30),
      }))
      .query(async ({ ctx, input }) => {
        try {
          // Verify the key belongs to the user
          const keys = await getUserApiKeys(ctx.user.id);
          if (!keys.find(k => k.id === input.keyId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }

          return await getKeyUsageMetrics(input.keyId, input.days);
        } catch (error) {
          console.error('Failed to get usage metrics:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get usage metrics' });
        }
      }),

    // Get daily usage summary
    daily: protectedProcedure
      .input(z.object({
        keyId: z.number().int().positive(),
        days: z.number().int().positive().default(30),
      }))
      .query(async ({ ctx, input }) => {
        try {
          // Verify the key belongs to the user
          const keys = await getUserApiKeys(ctx.user.id);
          if (!keys.find(k => k.id === input.keyId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }

          return await getDailyUsageSummary(input.keyId, input.days);
        } catch (error) {
          console.error('Failed to get daily usage:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get daily usage' });
        }
      }),

    // Record a request (called by gateway)
    record: publicProcedure
      .input(z.object({
        keyId: z.number().int().positive(),
        modelId: z.number().int().positive(),
        promptTokens: z.number().int().nonnegative(),
        completionTokens: z.number().int().nonnegative(),
        responseTimeMs: z.number().int().nonnegative(),
        statusCode: z.number().int(),
        errorMessage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          await recordUsage(
            input.keyId,
            input.modelId,
            input.promptTokens,
            input.completionTokens,
            input.responseTimeMs,
            input.statusCode,
            input.errorMessage
          );
          return { success: true };
        } catch (error) {
          console.error('Failed to record usage:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to record usage' });
        }
      }),
  }),

  /**
   * Admin Panel
   */
  admin: router({
    // Get all users
    users: adminProcedure
      .input(z.object({
        limit: z.number().int().positive().default(100),
        offset: z.number().int().nonnegative().default(0),
      }))
      .query(async ({ input }) => {
        try {
          return await getAllUsers(input.limit, input.offset);
        } catch (error) {
          console.error('Failed to get users:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get users' });
        }
      }),

    // Get all API keys
    apiKeys: adminProcedure
      .input(z.object({
        limit: z.number().int().positive().default(100),
        offset: z.number().int().nonnegative().default(0),
      }))
      .query(async ({ input }) => {
        try {
          return await getAllApiKeys(input.limit, input.offset);
        } catch (error) {
          console.error('Failed to get API keys:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get API keys' });
        }
      }),

    // Get admin logs
    logs: adminProcedure
      .input(z.object({
        limit: z.number().int().positive().default(100),
        offset: z.number().int().nonnegative().default(0),
      }))
      .query(async ({ input }) => {
        try {
          return await getAdminLogs(input.limit, input.offset);
        } catch (error) {
          console.error('Failed to get admin logs:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get admin logs' });
        }
      }),

    // Get platform usage statistics
    stats: adminProcedure
      .input(z.object({
        days: z.number().int().positive().default(30),
      }))
      .query(async ({ input }) => {
        try {
          return await getPlatformUsageStats(input.days);
        } catch (error) {
          console.error('Failed to get platform stats:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get platform stats' });
        }
      }),

    // Revoke a user's API key (admin action)
    revokeUserKey: adminProcedure
      .input(z.object({
        keyId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Get the key to find the user
          const allKeys = await getAllApiKeys(1000, 0);
          const key = allKeys.find(k => k.id === input.keyId);

          if (!key) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found' });
          }

          await revokeApiKey(input.keyId, key.userId);

          // Log the action
          await logAdminAction(
            ctx.user.id,
            'admin_revoke_api_key',
            key.userId,
            input.keyId
          );

          return { success: true };
        } catch (error) {
          console.error('Failed to revoke user key:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to revoke user key' });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
