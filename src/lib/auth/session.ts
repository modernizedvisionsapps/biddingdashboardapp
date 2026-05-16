import "server-only";

import { getServerEnv } from "../env";
import { createPrefixedId, randomToken } from "./tokens";
import { sha256Hex } from "./crypto";

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

export function getSessionCookieName(): string {
  return getServerEnv().sessionCookieName;
}

export function getSessionTtlSeconds(): number {
  return getServerEnv().sessionTtlDays * 24 * 60 * 60;
}

export function buildSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionTtlSeconds(),
  };
}

export function createSessionToken(): string {
  return randomToken();
}

export function createSessionId(): string {
  return createPrefixedId("sess_");
}

export async function hashSessionToken(rawToken: string): Promise<string> {
  return sha256Hex(rawToken);
}
