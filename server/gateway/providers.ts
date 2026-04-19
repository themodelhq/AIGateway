/**
 * Provider Router
 * Maps model names → provider, then forwards requests
 * to the correct upstream API in OpenAI-compatible format.
 */
import { ENV } from "../_core/env";

export type ProviderName = "openai" | "anthropic" | "groq" | "mistral" | "google";

export interface ChatMessage {
  role: string;
  content: string | unknown[];
  name?: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  [key: string]: unknown;
}

// ─── Model → Provider mapping ─────────────────────────────────────────────────

const MODEL_MAP: Record<string, { provider: ProviderName; upstream: string }> = {
  // OpenAI
  "gpt-4o":              { provider: "openai", upstream: "gpt-4o" },
  "gpt-4o-mini":         { provider: "openai", upstream: "gpt-4o-mini" },
  "gpt-4-turbo":         { provider: "openai", upstream: "gpt-4-turbo" },
  "gpt-4":               { provider: "openai", upstream: "gpt-4" },
  "gpt-3.5-turbo":       { provider: "openai", upstream: "gpt-3.5-turbo" },
  "text-embedding-3-small": { provider: "openai", upstream: "text-embedding-3-small" },
  "text-embedding-3-large": { provider: "openai", upstream: "text-embedding-3-large" },
  "dall-e-3":            { provider: "openai", upstream: "dall-e-3" },
  "whisper-1":           { provider: "openai", upstream: "whisper-1" },
  // Anthropic
  "claude-3-5-sonnet":         { provider: "anthropic", upstream: "claude-3-5-sonnet-20241022" },
  "claude-3-5-sonnet-20241022":{ provider: "anthropic", upstream: "claude-3-5-sonnet-20241022" },
  "claude-3-opus":             { provider: "anthropic", upstream: "claude-3-opus-20240229" },
  "claude-3-haiku":            { provider: "anthropic", upstream: "claude-3-haiku-20240307" },
  // Groq (fast inference)
  "llama-3-70b":         { provider: "groq", upstream: "llama-3.3-70b-versatile" },
  "llama-3-8b":          { provider: "groq", upstream: "llama-3.1-8b-instant" },
  "mixtral-8x7b":        { provider: "groq", upstream: "mixtral-8x7b-32768" },
  "gemma2-9b":           { provider: "groq", upstream: "gemma2-9b-it" },
  // Mistral
  "mistral-large":       { provider: "mistral", upstream: "mistral-large-latest" },
  "mistral-7b":          { provider: "mistral", upstream: "open-mistral-7b" },
  "mistral-8x7b":        { provider: "mistral", upstream: "open-mixtral-8x7b" },
  // Google
  "gemini-1.5-pro":      { provider: "google", upstream: "gemini-1.5-pro" },
  "gemini-1.5-flash":    { provider: "google", upstream: "gemini-1.5-flash" },
};

// All models list for GET /v1/models
export const ALL_MODELS = Object.entries(MODEL_MAP).map(([id, { provider }]) => ({
  id,
  object: "model" as const,
  created: 1700000000,
  owned_by: provider,
}));

export function resolveModel(model: string): { provider: ProviderName; upstream: string } | null {
  if (MODEL_MAP[model]) return MODEL_MAP[model];
  // Prefix matching fallback
  if (model.startsWith("gpt"))         return { provider: "openai",    upstream: model };
  if (model.startsWith("claude"))      return { provider: "anthropic", upstream: model };
  if (model.startsWith("llama"))       return { provider: "groq",      upstream: model };
  if (model.startsWith("mixtral"))     return { provider: "groq",      upstream: model };
  if (model.startsWith("mistral"))     return { provider: "mistral",   upstream: model };
  if (model.startsWith("gemini"))      return { provider: "google",    upstream: model };
  return null;
}

function getProviderKey(provider: ProviderName): string {
  switch (provider) {
    case "openai":    return ENV.openaiApiKey;
    case "anthropic": return ENV.anthropicApiKey;
    case "groq":      return ENV.groqApiKey;
    case "mistral":   return ENV.mistralApiKey;
    case "google":    return ENV.googleApiKey;
  }
}

function getProviderUrl(provider: ProviderName, path: string): string {
  switch (provider) {
    case "openai":    return `https://api.openai.com/v1${path}`;
    case "anthropic": return `https://api.anthropic.com/v1${path}`;
    case "groq":      return `https://api.groq.com/openai/v1${path}`;
    case "mistral":   return `https://api.mistral.ai/v1${path}`;
    case "google":    return `https://generativelanguage.googleapis.com/v1beta/openai${path}`;
  }
}

// ─── Anthropic transform (different API format) ───────────────────────────────

function toAnthropicRequest(req: ChatRequest, upstreamModel: string) {
  const system = req.messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const messages = req.messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role, content: m.content }));
  return {
    model: upstreamModel,
    messages,
    ...(system ? { system } : {}),
    max_tokens: req.max_tokens ?? 4096,
    ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    stream: req.stream ?? false,
  };
}

function fromAnthropicResponse(data: any, requestModel: string) {
  return {
    id: data.id ?? `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestModel,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: data.content?.[0]?.text ?? "",
      },
      finish_reason: data.stop_reason === "end_turn" ? "stop" : (data.stop_reason ?? "stop"),
    }],
    usage: {
      prompt_tokens:     data.usage?.input_tokens  ?? 0,
      completion_tokens: data.usage?.output_tokens ?? 0,
      total_tokens:      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
  };
}

// ─── Main forward function ────────────────────────────────────────────────────

export async function forwardChatCompletion(req: ChatRequest): Promise<Response> {
  const resolved = resolveModel(req.model);
  if (!resolved) {
    throw new Error(`Unknown model: ${req.model}`);
  }

  const { provider, upstream } = resolved;
  const apiKey = getProviderKey(provider);

  if (!apiKey) {
    throw new Error(`Provider "${provider}" is not configured. Add the API key in Render environment variables.`);
  }

  // Anthropic uses a different API format
  if (provider === "anthropic") {
    const body = toAnthropicRequest(req, upstream);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (req.stream) return resp; // pass SSE through

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message ?? resp.statusText);
    return new Response(JSON.stringify(fromAnthropicResponse(data, req.model)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // OpenAI-compatible providers (openai, groq, mistral, google)
  const url = getProviderUrl(provider, "/chat/completions");
  const payload = { ...req, model: upstream };
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function forwardEmbeddings(req: Record<string, unknown>): Promise<Response> {
  const model = (req.model as string) ?? "text-embedding-3-small";
  const resolved = resolveModel(model) ?? { provider: "openai" as ProviderName, upstream: model };
  const apiKey = getProviderKey(resolved.provider);
  if (!apiKey) throw new Error(`Provider "${resolved.provider}" not configured`);
  const url = getProviderUrl(resolved.provider, "/embeddings");
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ ...req, model: resolved.upstream }),
  });
}
