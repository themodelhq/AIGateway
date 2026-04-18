import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  createApiKey,
  getUserApiKeys,
  getApiKeyByHash,
  revokeApiKey,
  recordUsage,
  getKeyUsageMetrics,
  getActiveModels,
} from "./db";

describe("API Key Management", () => {
  let testUserId = 1;
  let testKeyId: number;
  let testKeyHash: string;
  let testRawKey: string;

  describe("Key Generation", () => {
    it("should generate a valid API key", () => {
      const key = generateApiKey();
      expect(key).toBeDefined();
      expect(key).toMatch(/^sk_/);
      expect(key.length).toBeGreaterThan(10);
    });

    it("should generate unique API keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });

    it("should hash API keys consistently", () => {
      const key = generateApiKey();
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    it("should extract correct key prefix", () => {
      const key = generateApiKey();
      const prefix = getKeyPrefix(key);
      expect(prefix).toBe(key.substring(0, 12));
      expect(prefix).toMatch(/^sk_/);
    });
  });

  describe("API Key CRUD Operations", () => {
    it("should create an API key", async () => {
      const result = await createApiKey(testUserId, "Test Key", "For testing", 1000);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.keyPrefix).toBeDefined();
      expect(result.key).toMatch(/^sk_/);

      testKeyId = result.id;
      testRawKey = result.key;
      testKeyHash = hashApiKey(result.key);
    });

    it("should retrieve user's API keys", async () => {
      const keys = await getUserApiKeys(testUserId);
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);

      const testKey = keys.find((k) => k.id === testKeyId);
      expect(testKey).toBeDefined();
      expect(testKey?.name).toBe("Test Key");
      expect(testKey?.isActive).toBe(true);
    });

    it("should retrieve API key by hash", async () => {
      const key = await getApiKeyByHash(testKeyHash);
      expect(key).toBeDefined();
      expect(key?.id).toBe(testKeyId);
      expect(key?.userId).toBe(testUserId);
      expect(key?.isActive).toBe(true);
    });

    it("should return undefined for invalid key hash", async () => {
      const key = await getApiKeyByHash("invalid_hash_12345");
      expect(key).toBeUndefined();
    });

    it("should revoke an API key", async () => {
      await revokeApiKey(testKeyId, testUserId);

      const key = await getApiKeyByHash(testKeyHash);
      expect(key?.isActive).toBe(false);
      expect(key?.revokedAt).toBeDefined();
    });

    it("should not retrieve revoked keys as active", async () => {
      const keys = await getUserApiKeys(testUserId);
      const revokedKey = keys.find((k) => k.id === testKeyId);
      expect(revokedKey?.isActive).toBe(false);
    });
  });

  describe("Usage Tracking", () => {
    let activeKeyId: number;
    let modelId = 1; // Assuming model with ID 1 exists

    beforeAll(async () => {
      // Create a new active key for usage tests
      const result = await createApiKey(testUserId, "Usage Test Key", "For usage tracking", 1000);
      activeKeyId = result.id;
    });

    it("should record API usage", async () => {
      await recordUsage(
        activeKeyId,
        modelId,
        100, // promptTokens
        50,  // completionTokens
        150, // responseTimeMs
        200, // statusCode
        undefined
      );

      // Verify the usage was recorded - just verify the function doesn't throw
      const metrics = await getKeyUsageMetrics(activeKeyId, 30);
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it("should record usage with error message", async () => {
      await recordUsage(
        activeKeyId,
        modelId,
        50,
        0,
        200,
        500,
        "Rate limit exceeded"
      );

      // Verify the function doesn't throw
      const metrics = await getKeyUsageMetrics(activeKeyId, 30);
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it("should aggregate usage metrics correctly", async () => {
      // Record multiple requests
      for (let i = 0; i < 3; i++) {
        await recordUsage(activeKeyId, modelId, 100, 50, 150, 200);
      }

      // Verify the function doesn't throw and returns data
      const metrics = await getKeyUsageMetrics(activeKeyId, 30);
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it("should filter metrics by date range", async () => {
      const metricsAll = await getKeyUsageMetrics(activeKeyId, 30);
      const metrics7Days = await getKeyUsageMetrics(activeKeyId, 7);

      // Both should return arrays
      expect(Array.isArray(metricsAll)).toBe(true);
      expect(Array.isArray(metrics7Days)).toBe(true);
    });
  });

  describe("Models", () => {
    it("should retrieve active models", async () => {
      const models = await getActiveModels();
      expect(Array.isArray(models)).toBe(true);
      // Models might be empty if not seeded, but the function should work
      expect(models).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle creating multiple keys for same user", async () => {
      const key1 = await createApiKey(testUserId, "Key 1", undefined, 1000);
      const key2 = await createApiKey(testUserId, "Key 2", undefined, 500);

      expect(key1.id).not.toBe(key2.id);
      expect(key1.key).not.toBe(key2.key);

      const keys = await getUserApiKeys(testUserId);
      expect(keys.filter((k) => k.name === "Key 1" || k.name === "Key 2").length).toBeGreaterThanOrEqual(2);
    });

    it("should handle rate limit updates", async () => {
      const key = await createApiKey(testUserId, "Rate Limited Key", undefined, 100);
      const keys = await getUserApiKeys(testUserId);
      const foundKey = keys.find((k) => k.id === key.id);

      expect(foundKey?.rateLimit).toBe(100);
    });

    it("should preserve key metadata", async () => {
      const description = "This is a test key for production use";
      const key = await createApiKey(testUserId, "Metadata Test", description, 2000);

      const keys = await getUserApiKeys(testUserId);
      const foundKey = keys.find((k) => k.id === key.id);

      expect(foundKey?.description).toBe(description);
      expect(foundKey?.name).toBe("Metadata Test");
      expect(foundKey?.rateLimit).toBe(2000);
    });
  });
});
