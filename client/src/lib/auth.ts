/**
 * Client-side auth token storage.
 * Uses localStorage so the token survives page reloads and
 * works across origins (Netlify frontend → Render backend).
 */
const TOKEN_KEY = "ai_gateway_token";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
