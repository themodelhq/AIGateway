/**
 * Base URL for all API calls.
 *
 * Set VITE_API_URL in your Netlify dashboard to your Render backend URL.
 * e.g.  VITE_API_URL = https://ai-gateway-api.onrender.com
 *
 * In local development leave it unset — Vite proxies /api → localhost:3000.
 */
export const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
