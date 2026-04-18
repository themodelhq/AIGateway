import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");

export default defineConfig({
  schema:  "./drizzle/schema.ts",
  out:     "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: dbPath },
});
