import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { MinimalD1Database } from "../db/client";

interface CloudflareRuntimeEnv {
  DB?: MinimalD1Database;
  [key: string]: unknown;
}

export function getCloudflareRuntimeEnv(): CloudflareRuntimeEnv | null {
  try {
    const context = getCloudflareContext();
    return (context?.env as CloudflareRuntimeEnv | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function getCloudflareRuntimeEnvAsync(): Promise<CloudflareRuntimeEnv | null> {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context?.env as CloudflareRuntimeEnv | undefined) ?? null;
  } catch {
    return null;
  }
}

export function getCloudflareDb(): MinimalD1Database | null {
  return getCloudflareRuntimeEnv()?.DB ?? null;
}
