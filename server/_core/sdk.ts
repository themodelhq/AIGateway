/**
 * Auth SDK — issues and verifies JWT session tokens.
 * Tokens are sent by the client as: Authorization: Bearer <token>
 * Cookie fallback is kept for same-origin dev use.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

export type SessionPayload = { openId: string; appId: string; name: string };

class SDKServer {
  private getSecret() {
    return new TextEncoder().encode(ENV.cookieSecret || "fallback-dev-secret-change-me");
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const exp = Math.floor((Date.now() + expiresInMs) / 1000);
    return new SignJWT({ openId, appId: ENV.appId || "ai-gateway", name: options.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(exp)
      .sign(this.getSecret());
  }

  async verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.getSecret(), { algorithms: ["HS256"] });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) return null;
      return { openId, appId, name: isNonEmptyString(name) ? name : "" };
    } catch {
      return null;
    }
  }

  /** Extract token from Authorization header or cookie (fallback for dev). */
  private extractToken(req: Request): string | undefined {
    // 1. Authorization: Bearer <token>  (primary — works cross-origin)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
    // 2. Cookie fallback (same-origin / dev)
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookieHeader(cookieHeader);
      return cookies[COOKIE_NAME];
    }
    return undefined;
  }

  async authenticateRequest(req: Request): Promise<User> {
    const token   = this.extractToken(req);
    const session = await this.verifySession(token);
    if (!session) throw ForbiddenError("Invalid or missing session");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");

    return user;
  }
}

export const sdk = new SDKServer();
