/**
 * Local email/password authentication routes.
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — sign in
 * POST /api/auth/logout    — clear session cookie
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
  // Register
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

      const passwordHash = hashPassword(password);
      const user = await db.createUserWithPassword(name, email, passwordHash);

      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error("[Auth] Register failed:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login
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

      const passwordHash = hashPassword(password);
      if (passwordHash !== user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error("[Auth] Login failed:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout (kept for direct REST call; tRPC route also exists)
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
