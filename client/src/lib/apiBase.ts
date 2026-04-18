/**
 * Base URL for all API calls.
 * - In development: empty string → Vite proxies /api → localhost:3000
 * - On Netlify:     empty string → Netlify redirect rule forwards /api/* to Render
 * - If VITE_API_URL is explicitly set it is used directly (optional override)
 */
export const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
