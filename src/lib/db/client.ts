import "server-only";

import { getCloudflareDb } from "../cloudflare/runtime";

export interface MinimalD1Result<T = unknown> {
  success: boolean;
  results?: T[];
  meta?: Record<string, unknown>;
}

export interface MinimalD1Statement<T = unknown> {
  bind(...values: unknown[]): MinimalD1Statement<T>;
  first<R = T>(): Promise<R | null>;
  all<R = T>(): Promise<MinimalD1Result<R>>;
  run(): Promise<MinimalD1Result<T>>;
}

export interface MinimalD1Database {
  prepare<T = unknown>(query: string): MinimalD1Statement<T>;
  batch?<T = unknown>(statements: MinimalD1Statement<T>[]): Promise<MinimalD1Result<T>[]>;
  exec?(query: string): Promise<MinimalD1Result>;
}

export function getDb(env: { DB?: MinimalD1Database | null }): MinimalD1Database {
  if (!env.DB) {
    throw new Error("Missing D1 binding: DB");
  }

  return env.DB;
}

export function getRuntimeDb(): MinimalD1Database {
  const runtime = globalThis as typeof globalThis & { DB?: MinimalD1Database };
  return getDb({ DB: runtime.DB ?? getCloudflareDb() });
}
