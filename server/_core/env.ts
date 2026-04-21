export const ENV = {
  appId:        process.env.APP_ID          ?? "ai-gateway",
  cookieSecret: process.env.JWT_SECRET      ?? "change-me-in-production",
  isProduction: process.env.NODE_ENV        === "production",
  adminEmail:   process.env.ADMIN_EMAIL     ?? "",
  dbPath:       process.env.DB_PATH         ?? "",
  // Provider API keys
  openaiApiKey:     process.env.OPENAI_API_KEY     ?? "",
  anthropicApiKey:  process.env.ANTHROPIC_API_KEY  ?? "",
  groqApiKey:       process.env.GROQ_API_KEY        ?? "",
  mistralApiKey:    process.env.MISTRAL_API_KEY     ?? "",
  googleApiKey:     process.env.GOOGLE_API_KEY      ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY  ?? "",
  ollamaApiKey:     process.env.OLLAMA_API_KEY      ?? "",
  ollamaBaseUrl:    process.env.OLLAMA_BASE_URL     ?? "",
  // Legacy forge proxy (optional)
  forgeApiUrl: process.env.FORGE_API_URL ?? "",
  forgeApiKey: process.env.FORGE_API_KEY ?? "",
};
