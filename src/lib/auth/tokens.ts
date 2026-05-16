import "server-only";

import { sha256Hex } from "./crypto";

const DEFAULT_TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomToken(bytes = DEFAULT_TOKEN_BYTES): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return toBase64Url(value);
}

export async function hashToken(token: string): Promise<string> {
  return sha256Hex(token);
}

export function createPrefixedId(prefix: string): string {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "")}`;
}
