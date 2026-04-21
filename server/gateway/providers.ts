/**
 * Provider Router
 * Supports: OpenAI, Anthropic, Groq, Mistral, Google, OpenRouter, Ollama
 */
import { ENV } from "../_core/env";

export type ProviderName = "openai" | "anthropic" | "groq" | "mistral" | "google" | "openrouter" | "ollama";

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

const MODEL_MAP: Record<string, { provider: ProviderName; upstream: string; free?: boolean; context?: number; description?: string }> = {
  // ── OpenAI ──────────────────────────────────────────────────────────────────
  "gpt-4o":                    { provider: "openai", upstream: "gpt-4o",             context: 128000, description: "Most capable GPT-4 model, multimodal" },
  "gpt-4o-mini":               { provider: "openai", upstream: "gpt-4o-mini",         context: 128000, description: "Fast and affordable GPT-4 class model" },
  "gpt-4-turbo":               { provider: "openai", upstream: "gpt-4-turbo",         context: 128000, description: "High capability GPT-4 with large context" },
  "gpt-4":                     { provider: "openai", upstream: "gpt-4",               context: 8192,   description: "Original GPT-4 model" },
  "gpt-3.5-turbo":             { provider: "openai", upstream: "gpt-3.5-turbo",       context: 16385,  description: "Fast and cost-effective" },
  "text-embedding-3-small":    { provider: "openai", upstream: "text-embedding-3-small", context: 8191, description: "Efficient text embeddings" },
  "text-embedding-3-large":    { provider: "openai", upstream: "text-embedding-3-large", context: 8191, description: "High-performance text embeddings" },
  "dall-e-3":                  { provider: "openai", upstream: "dall-e-3",            description: "Image generation" },
  "whisper-1":                 { provider: "openai", upstream: "whisper-1",           description: "Speech-to-text transcription" },

  // ── Anthropic ────────────────────────────────────────────────────────────────
  "claude-3-5-sonnet":         { provider: "anthropic", upstream: "claude-3-5-sonnet-20241022", context: 200000, description: "Most intelligent Claude model" },
  "claude-3-5-sonnet-20241022":{ provider: "anthropic", upstream: "claude-3-5-sonnet-20241022", context: 200000, description: "Most intelligent Claude model" },
  "claude-3-opus":             { provider: "anthropic", upstream: "claude-3-opus-20240229",     context: 200000, description: "Powerful model for complex tasks" },
  "claude-3-haiku":            { provider: "anthropic", upstream: "claude-3-haiku-20240307",    context: 200000, description: "Fastest and most compact Claude" },

  // ── Groq (ultra-fast inference) ──────────────────────────────────────────────
  "llama-3-70b":               { provider: "groq", upstream: "llama-3.3-70b-versatile", context: 8192,  description: "Powerful LLaMA 3 via Groq" },
  "llama-3-8b":                { provider: "groq", upstream: "llama-3.1-8b-instant",    context: 8192,  description: "Fast lightweight LLaMA 3 via Groq" },
  "mixtral-8x7b":              { provider: "groq", upstream: "mixtral-8x7b-32768",      context: 32768, description: "Fast MoE model via Groq" },
  "gemma2-9b":                 { provider: "groq", upstream: "gemma2-9b-it",            context: 8192,  description: "Google Gemma 2 via Groq" },

  // ── Mistral ──────────────────────────────────────────────────────────────────
  "mistral-large":             { provider: "mistral", upstream: "mistral-large-latest", context: 32000, description: "Top-tier Mistral reasoning model" },
  "mistral-7b":                { provider: "mistral", upstream: "open-mistral-7b",      context: 32000, description: "Efficient open-weight model" },
  "mistral-8x7b":              { provider: "mistral", upstream: "open-mixtral-8x7b",    context: 32000, description: "MoE model with large context" },

  // ── Google Gemini ────────────────────────────────────────────────────────────
  "gemini-1.5-pro":            { provider: "google", upstream: "gemini-1.5-pro",   context: 1000000, description: "Best performing Gemini model" },
  "gemini-1.5-flash":          { provider: "google", upstream: "gemini-1.5-flash", context: 1000000, description: "Fast versatile multimodal model" },

  // ── OpenRouter FREE models (no credit card, 20 req/min, 200 req/day) ─────────
  "openrouter/free":                                        { provider: "openrouter", upstream: "openrouter/free",                                        free: true, context: 200000, description: "Auto-selects best free model — OpenRouter's smart router" },
  "meta-llama/llama-3.3-70b-instruct:free":                { provider: "openrouter", upstream: "meta-llama/llama-3.3-70b-instruct:free",                free: true, context: 66000,  description: "Meta LLaMA 3.3 70B — best free general purpose model" },
  "qwen/qwen3-coder:free":                                  { provider: "openrouter", upstream: "qwen/qwen3-coder:free",                                  free: true, context: 262000, description: "Qwen3 Coder 480B — best free coding model" },
  "qwen/qwen3-next-80b-a3b-instruct:free":                  { provider: "openrouter", upstream: "qwen/qwen3-next-80b-a3b-instruct:free",                  free: true, context: 262000, description: "Qwen3 80B — strong reasoning and instruction following" },
  "deepseek/deepseek-r1:free":                              { provider: "openrouter", upstream: "deepseek/deepseek-r1:free",                              free: true, context: 131000, description: "DeepSeek R1 — best free reasoning and coding model" },
  "google/gemma-4-31b-it:free":                             { provider: "openrouter", upstream: "google/gemma-4-31b-it:free",                             free: true, context: 262000, description: "Google Gemma 4 31B — multimodal vision + tools" },
  "google/gemma-4-26b-a4b-it:free":                         { provider: "openrouter", upstream: "google/gemma-4-26b-a4b-it:free",                         free: true, context: 262000, description: "Google Gemma 4 26B — fast multimodal model" },
  "google/gemma-3-27b-it:free":                             { provider: "openrouter", upstream: "google/gemma-3-27b-it:free",                             free: true, context: 131000, description: "Google Gemma 3 27B — vision capable" },
  "nvidia/nemotron-3-super-120b-a12b:free":                 { provider: "openrouter", upstream: "nvidia/nemotron-3-super-120b-a12b:free",                 free: true, context: 262000, description: "NVIDIA Nemotron Super 120B — reasoning and agents" },
  "openai/gpt-oss-120b:free":                               { provider: "openrouter", upstream: "openai/gpt-oss-120b:free",                               free: true, context: 131000, description: "OpenAI open-weight 120B MoE — reasoning + tools" },
  "openai/gpt-oss-20b:free":                                { provider: "openrouter", upstream: "openai/gpt-oss-20b:free",                                free: true, context: 131000, description: "OpenAI open-weight 20B — fast and deployable" },
  "minimax/minimax-m2.5:free":                              { provider: "openrouter", upstream: "minimax/minimax-m2.5:free",                              free: true, context: 197000, description: "MiniMax M2.5 — long context model" },
  "nvidia/nemotron-nano-12b-v2-vl:free":                    { provider: "openrouter", upstream: "nvidia/nemotron-nano-12b-v2-vl:free",                    free: true, context: 128000, description: "NVIDIA Nemotron Nano 12B — vision + video" },
  "nvidia/nemotron-nano-9b-v2:free":                        { provider: "openrouter", upstream: "nvidia/nemotron-nano-9b-v2:free",                        free: true, context: 128000, description: "NVIDIA Nemotron Nano 9B — reasoning model" },
  "nvidia/nemotron-3-nano-30b-a3b:free":                    { provider: "openrouter", upstream: "nvidia/nemotron-3-nano-30b-a3b:free",                    free: true, context: 256000, description: "NVIDIA Nemotron Nano 30B — tools support" },
  "arcee-ai/trinity-large-preview:free":                    { provider: "openrouter", upstream: "arcee-ai/trinity-large-preview:free",                    free: true, context: 131000, description: "Arcee Trinity Large — 400B MoE, creative writing" },
  "meta-llama/llama-3.2-3b-instruct:free":                  { provider: "openrouter", upstream: "meta-llama/llama-3.2-3b-instruct:free",                  free: true, context: 131000, description: "Meta LLaMA 3.2 3B — ultra-lightweight model" },
  "nousresearch/hermes-3-llama-3.1-405b:free":              { provider: "openrouter", upstream: "nousresearch/hermes-3-llama-3.1-405b:free",              free: true, context: 131000, description: "Hermes 3 LLaMA 405B — large instruction model" },
  "z-ai/glm-4.5-air:free":                                  { provider: "openrouter", upstream: "z-ai/glm-4.5-air:free",                                  free: true, context: 131000, description: "Z.ai GLM 4.5 Air — multilingual tools model" },
  "liquid/lfm-2.5-1.2b-thinking:free":                      { provider: "openrouter", upstream: "liquid/lfm-2.5-1.2b-thinking:free",                      free: true, context: 33000,  description: "LiquidAI LFM 2.5 1.2B — lightweight reasoning" },
  "liquid/lfm-2.5-1.2b-instruct:free":                      { provider: "openrouter", upstream: "liquid/lfm-2.5-1.2b-instruct:free",                      free: true, context: 33000,  description: "LiquidAI LFM 2.5 1.2B — fast instruction model" },
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": { provider: "openrouter", upstream: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", free: true, context: 33000, description: "Dolphin Mistral 24B Venice — uncensored assistant" },
  "google/gemma-3-12b-it:free":                             { provider: "openrouter", upstream: "google/gemma-3-12b-it:free",                             free: true, context: 33000,  description: "Google Gemma 3 12B — vision model" },
  "google/gemma-3-4b-it:free":                              { provider: "openrouter", upstream: "google/gemma-3-4b-it:free",                              free: true, context: 33000,  description: "Google Gemma 3 4B — lightweight vision model" },
  "google/gemma-3n-e4b-it:free":                            { provider: "openrouter", upstream: "google/gemma-3n-e4b-it:free",                            free: true, context: 8000,   description: "Google Gemma 3n E4B — tiny efficient model" },
  "google/gemma-3n-e2b-it:free":                            { provider: "openrouter", upstream: "google/gemma-3n-e2b-it:free",                            free: true, context: 8000,   description: "Google Gemma 3n E2B — smallest free model" },
  "openrouter/elephant-alpha":                              { provider: "openrouter", upstream: "openrouter/elephant-alpha",                              free: true, context: 262000, description: "OpenRouter Elephant Alpha — tools capable" },

  // ── Ollama (self-hosted / Ollama Cloud) ──────────────────────────────────────
  "ollama/llama3":             { provider: "ollama", upstream: "llama3",         context: 8192,  description: "Meta LLaMA 3 via Ollama" },
  "ollama/deepseek-r1":        { provider: "ollama", upstream: "deepseek-r1",    context: 32000, description: "DeepSeek R1 reasoning model via Ollama" },
  "ollama/qwen3-coder":        { provider: "ollama", upstream: "qwen3-coder",    context: 32000, description: "Qwen3 Coder via Ollama" },
  "ollama/mistral":            { provider: "ollama", upstream: "mistral",        context: 8192,  description: "Mistral 7B via Ollama" },
  "ollama/gemma3":             { provider: "ollama", upstream: "gemma3",         context: 8192,  description: "Google Gemma 3 via Ollama" },
  "ollama/phi4":               { provider: "ollama", upstream: "phi4",           context: 16384, description: "Microsoft Phi-4 via Ollama" },
  "ollama/codellama":          { provider: "ollama", upstream: "codellama",      context: 16384, description: "Code LLaMA via Ollama" },
};

// ─── Public model list for GET /v1/models ─────────────────────────────────────

export const ALL_MODELS = Object.entries(MODEL_MAP).map(([id, meta]) => ({
  id,
  object: "model" as const,
  created: 1700000000,
  owned_by: meta.provider,
  free: meta.free ?? false,
  context_length: meta.context ?? null,
  description: meta.description ?? null,
}));

export function resolveModel(model: string): { provider: ProviderName; upstream: string } | null {
  if (MODEL_MAP[model]) return { provider: MODEL_MAP[model].provider, upstream: MODEL_MAP[model].upstream };
  // Prefix matching fallback
  if (model.startsWith("gpt"))                return { provider: "openai",      upstream: model };
  if (model.startsWith("claude"))             return { provider: "anthropic",   upstream: model };
  if (model.startsWith("llama"))              return { provider: "groq",        upstream: model };
  if (model.startsWith("mixtral"))            return { provider: "groq",        upstream: model };
  if (model.startsWith("mistral"))            return { provider: "mistral",     upstream: model };
  if (model.startsWith("gemini"))             return { provider: "google",      upstream: model };
  if (model.includes(":free") || model.startsWith("openrouter/") || model.includes("/"))
                                              return { provider: "openrouter",  upstream: model };
  if (model.startsWith("ollama/"))            return { provider: "ollama",      upstream: model.replace("ollama/", "") };
  return null;
}

function getProviderKey(provider: ProviderName): string {
  switch (provider) {
    case "openai":      return ENV.openaiApiKey;
    case "anthropic":   return ENV.anthropicApiKey;
    case "groq":        return ENV.groqApiKey;
    case "mistral":     return ENV.mistralApiKey;
    case "google":      return ENV.googleApiKey;
    case "openrouter":  return ENV.openrouterApiKey;
    case "ollama":      return ENV.ollamaApiKey || "ollama"; // ollama doesn't need a key
  }
}

function getProviderBaseUrl(provider: ProviderName): string {
  switch (provider) {
    case "openai":      return "https://api.openai.com/v1";
    case "anthropic":   return "https://api.anthropic.com/v1";
    case "groq":        return "https://api.groq.com/openai/v1";
    case "mistral":     return "https://api.mistral.ai/v1";
    case "google":      return "https://generativelanguage.googleapis.com/v1beta/openai";
    case "openrouter":  return "https://openrouter.ai/api/v1";
    case "ollama":      return (ENV.ollamaBaseUrl || "http://localhost:11434") + "/v1";
  }
}

// ─── Anthropic-specific transform ────────────────────────────────────────────

function toAnthropicRequest(req: ChatRequest, upstreamModel: string) {
  const system = req.messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const messages = req.messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));
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
    id:      data.id ?? `chatcmpl-${Date.now()}`,
    object:  "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model:   requestModel,
    choices: [{ index: 0, message: { role: "assistant", content: data.content?.[0]?.text ?? "" }, finish_reason: data.stop_reason === "end_turn" ? "stop" : (data.stop_reason ?? "stop") }],
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
  if (!resolved) throw new Error(`Unknown model: ${req.model}`);

  const { provider, upstream } = resolved;
  const apiKey = getProviderKey(provider);

  if (!apiKey && provider !== "ollama") {
    const keyName = provider === "openrouter" ? "OPENROUTER_API_KEY" : `${provider.toUpperCase()}_API_KEY`;
    throw new Error(`Provider "${provider}" requires ${keyName} to be set in environment variables.`);
  }

  // Anthropic uses a different API format
  if (provider === "anthropic") {
    const body = toAnthropicRequest(req, upstream);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    if (req.stream) return resp;
    const data = await resp.json();
    if (!resp.ok) throw new Error((data as any).error?.message ?? resp.statusText);
    return new Response(JSON.stringify(fromAnthropicResponse(data, req.model)), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }

  // OpenAI-compatible: OpenAI, Groq, Mistral, Google, OpenRouter, Ollama
  const baseUrl = getProviderBaseUrl(provider);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;

  // OpenRouter requires HTTP-Referer header
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://aigateway.onrender.com";
    headers["X-Title"] = "AI Gateway";
  }

  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...req, model: upstream }),
  });
}

export async function forwardEmbeddings(req: Record<string, unknown>): Promise<Response> {
  const model = (req.model as string) ?? "text-embedding-3-small";
  const resolved = resolveModel(model) ?? { provider: "openai" as ProviderName, upstream: model };
  const apiKey = getProviderKey(resolved.provider);
  if (!apiKey) throw new Error(`Provider "${resolved.provider}" not configured`);
  const baseUrl = getProviderBaseUrl(resolved.provider);
  return fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ ...req, model: resolved.upstream }),
  });
}
