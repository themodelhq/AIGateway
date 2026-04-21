/**
 * OpenAI-compatible Gateway Routes
 * Mounts on /v1/* — publicly accessible via API key auth.
 *
 * GET  /v1/models
 * POST /v1/chat/completions
 * POST /v1/completions
 * POST /v1/embeddings
 * GET  /health
 */
import type { Express, Request, Response, NextFunction } from "express";
import { getApiKeyByHash, hashApiKey, recordUsage, updateApiKeyLastUsed } from "../db";
import { checkRateLimit } from "./ratelimit";
import { estimateCost } from "./pricing";
import { forwardChatCompletion, forwardEmbeddings, ALL_MODELS, resolveModel } from "./providers";
import { ENV } from "../_core/env";

// ─── API key middleware ───────────────────────────────────────────────────────

async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: { message: "Missing API key. Provide Authorization: Bearer <key>", type: "invalid_request_error" }
    });
    return;
  }

  const rawKey = authHeader.slice(7).trim();
  const keyHash = hashApiKey(rawKey);
  const apiKey = await getApiKeyByHash(keyHash);

  if (!apiKey || !apiKey.isActive || apiKey.revokedAt) {
    res.status(401).json({
      error: { message: "Invalid or revoked API key", type: "invalid_request_error" }
    });
    return;
  }

  // Rate limiting
  const limit = apiKey.rateLimit ?? 1000;
  const { allowed, remaining, resetAt } = checkRateLimit(apiKey.id, limit);
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

  if (!allowed) {
    res.status(429).json({
      error: { message: "Rate limit exceeded. Try again in a moment.", type: "rate_limit_error" }
    });
    return;
  }

  // Attach to request for downstream use
  (req as any).gatewayKey = apiKey;
  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorResponse(res: Response, status: number, message: string, type = "api_error") {
  res.status(status).json({ error: { message, type } });
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerGatewayRoutes(app: Express) {

  // Health check (no auth needed)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── GET /v1/models ──────────────────────────────────────────────────────────
  app.get("/v1/models", (_req, res) => {
    res.json({ object: "list", data: ALL_MODELS });
  });

  // ── POST /v1/chat/completions ───────────────────────────────────────────────
  app.post("/v1/chat/completions", requireApiKey, async (req: Request, res: Response) => {
    const gatewayKey = (req as any).gatewayKey;
    const { model, stream } = req.body;

    if (!model) { errorResponse(res, 400, "model is required"); return; }
    if (!req.body.messages?.length) { errorResponse(res, 400, "messages are required"); return; }

    const resolved = resolveModel(model);
    if (!resolved) {
      errorResponse(res, 400, `Unknown model: ${model}. GET /v1/models for the list.`); return;
    }

    const start = Date.now();
    try {
      const upstream = await forwardChatCompletion(req.body);

      // Streaming — pipe SSE through
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        if (upstream.body) {
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value));
          }
        }
        res.end();
        await updateApiKeyLastUsed(gatewayKey.id);
        return;
      }

      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({})) as any;
        errorResponse(res, upstream.status, err?.error?.message ?? upstream.statusText);
        return;
      }

      const data = await upstream.json() as any;

      // Track usage
      const promptTokens     = data.usage?.prompt_tokens     ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;
      const cost = estimateCost(model, promptTokens, completionTokens);

      await updateApiKeyLastUsed(gatewayKey.id);
      await recordUsage({
        apiKeyId:         gatewayKey.id,
        modelId:          1, // placeholder — production would use aiModels table id
        requestCount:     1,
        promptTokens,
        completionTokens,
        totalTokens:      promptTokens + completionTokens,
        estimatedCost:    cost,
        responseTimeMs:   Date.now() - start,
        statusCode:       200,
      });

      // Normalise to OpenAI format
      res.json({
        id:      data.id      ?? `chatcmpl-${Date.now()}`,
        object:  "chat.completion",
        created: data.created ?? Math.floor(Date.now() / 1000),
        model:   model,
        choices: data.choices ?? [],
        usage:   data.usage   ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });

    } catch (err: any) {
      console.error("[Gateway] chat/completions error:", err);
      await recordUsage({
        apiKeyId: gatewayKey.id, modelId: 1, requestCount: 1,
        responseTimeMs: Date.now() - start, statusCode: 500,
        errorMessage: err.message,
      });
      errorResponse(res, 500, err.message ?? "Internal gateway error");
    }
  });

  // ── POST /v1/completions (legacy) ───────────────────────────────────────────
  app.post("/v1/completions", requireApiKey, async (req: Request, res: Response) => {
    // Convert legacy completions → chat completions
    const { prompt, model, ...rest } = req.body;
    const chatReq = {
      ...rest,
      model: model ?? "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt ?? "" }],
    };
    req.body = chatReq;
    // Reuse chat handler logic
    const gatewayKey = (req as any).gatewayKey;
    const start = Date.now();
    try {
      const upstream = await forwardChatCompletion(chatReq);
      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({})) as any;
        errorResponse(res, upstream.status, err?.error?.message ?? upstream.statusText);
        return;
      }
      const data = await upstream.json() as any;
      const choice = data.choices?.[0];
      res.json({
        id:      data.id ?? `cmpl-${Date.now()}`,
        object:  "text_completion",
        created: data.created ?? Math.floor(Date.now() / 1000),
        model,
        choices: [{
          text:          choice?.message?.content ?? "",
          index:         0,
          finish_reason: choice?.finish_reason ?? "stop",
        }],
        usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });
      await updateApiKeyLastUsed(gatewayKey.id);
      await recordUsage({
        apiKeyId: gatewayKey.id, modelId: 1, requestCount: 1,
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        responseTimeMs: Date.now() - start, statusCode: 200,
      });
    } catch (err: any) {
      errorResponse(res, 500, err.message);
    }
  });

  // ── POST /v1/embeddings ─────────────────────────────────────────────────────
  app.post("/v1/embeddings", requireApiKey, async (req: Request, res: Response) => {
    try {
      const upstream = await forwardEmbeddings(req.body);
      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({})) as any;
        errorResponse(res, upstream.status, err?.error?.message ?? upstream.statusText);
        return;
      }
      const data = await upstream.json();
      res.json(data);
    } catch (err: any) {
      errorResponse(res, 500, err.message);
    }
  });

  // ── POST /v1/images/generations ─────────────────────────────────────────────
  app.post("/v1/images/generations", requireApiKey, async (req: Request, res: Response) => {
    if (!ENV.openaiApiKey) { errorResponse(res, 501, "Image generation requires OPENAI_API_KEY"); return; }
    try {
      const upstream = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${ENV.openaiApiKey}` },
        body: JSON.stringify({ ...req.body, model: req.body.model ?? "dall-e-3" }),
      });
      const data = await upstream.json();
      if (!upstream.ok) { errorResponse(res, upstream.status, (data as any).error?.message ?? upstream.statusText); return; }
      res.json(data);
    } catch (err: any) {
      errorResponse(res, 500, err.message);
    }
  });

  // ── POST /v1/audio/transcriptions ───────────────────────────────────────────
  app.post("/v1/audio/transcriptions", requireApiKey, async (req: Request, res: Response) => {
    if (!ENV.openaiApiKey) { errorResponse(res, 501, "Audio transcription requires OPENAI_API_KEY"); return; }
    // Forward multipart/form-data directly
    try {
      const headers: Record<string, string> = { "authorization": `Bearer ${ENV.openaiApiKey}` };
      if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];
      const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST", headers,
        body: req as any,
      });
      const data = await upstream.json();
      if (!upstream.ok) { errorResponse(res, upstream.status, (data as any).error?.message ?? upstream.statusText); return; }
      res.json(data);
    } catch (err: any) {
      errorResponse(res, 500, err.message);
    }
  });
}
