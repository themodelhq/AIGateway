/**
 * In-memory rate limiter (per API key).
 * Sliding window — resets every 60 seconds.
 * For production, replace with Redis.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export function checkRateLimit(keyId: number, limitPerMinute: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = String(keyId);
  let win = windows.get(key);

  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + 60_000 };
    windows.set(key, win);
  }

  if (win.count >= limitPerMinute) {
    return { allowed: false, remaining: 0, resetAt: win.resetAt };
  }

  win.count++;
  return { allowed: true, remaining: limitPerMinute - win.count, resetAt: win.resetAt };
}

// Clean up expired windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of windows.entries()) {
    if (now > win.resetAt) windows.delete(key);
  }
}, 300_000);
