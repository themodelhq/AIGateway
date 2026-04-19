/**
 * Local email/password authentication routes.
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — sign in
 * POST /api/auth/logout    — clear session
 *
 * The JWT is returned in the JSON body as `token` so the client can
 * store it in localStorage and send it as `Authorization: Bearer <token>`.
 * This works correctly across origins (Netlify → Render).
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function registerOAuthRoutes(app: Express) {

  // ── Register ───────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};

    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    try {
      const existing = await db.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      const user = await db.createUserWithPassword(name, email, hashPassword(password));
      if (!user) { res.status(500).json({ error: "Failed to create user" }); return; }

      const token = await sdk.createSessionToken(user.openId, {
        name: user.name || "", expiresInMs: ONE_YEAR_MS,
      });

      // Also set cookie for same-origin / dev convenience
      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        token,                                          // ← client saves this
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error("[Auth] Register failed:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Login ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      if (hashPassword(password) !== user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = await sdk.createSessionToken(user.openId, {
        name: user.name || "", expiresInMs: ONE_YEAR_MS,
      });

      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date().toISOString() as any });

      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        token,                                          // ← client saves this
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error("[Auth] Login failed:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
    // Client also clears localStorage token via clearToken()
  });
}
