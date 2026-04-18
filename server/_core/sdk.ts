/**
 * Self-contained auth SDK (replaces Manus OAuth).
 * Uses JWT session cookies; login is handled by the /api/auth/* routes.
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

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

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

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) return null;
      return { openId, appId, name: isNonEmptyString(name) ? name : "" };
    } catch {
      return null;
    }
  }

  private parseCookies(header: string | undefined) {
    if (!header) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(header)));
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const token = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(token);

    if (!session) throw ForbiddenError("Invalid or missing session");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");

    return user;
  }
}

export const sdk = new SDKServer();
