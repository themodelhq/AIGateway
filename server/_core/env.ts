export const ENV = {
  appId:       process.env.APP_ID       ?? "ai-gateway",
  cookieSecret: process.env.JWT_SECRET  ?? "change-me-in-production",
  isProduction: process.env.NODE_ENV    === "production",
  adminEmail:  process.env.ADMIN_EMAIL  ?? "",
  // Path to the SQLite database file (default: ./data/app.db)
  dbPath:      process.env.DB_PATH      ?? "",
  // Optional built-in proxy utilities
  forgeApiUrl: process.env.FORGE_API_URL ?? "",
  forgeApiKey: process.env.FORGE_API_KEY ?? "",
};
