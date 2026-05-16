import "server-only";

import { getCloudflareRuntimeEnvAsync } from "./cloudflare/runtime";

const PLACEHOLDER_VALUE = ".";

type RuntimeEnvSource = Record<string, unknown> | null | undefined;

function sanitizeEnvValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === PLACEHOLDER_VALUE) {
    return undefined;
  }

  return trimmed;
}

function readEnvValue(name: string, runtimeEnv?: RuntimeEnvSource): string | undefined {
  const value = process.env[name] ?? runtimeEnv?.[name];
  if (!value) {
    return undefined;
  }

  return sanitizeEnvValue(value);
}

function readOptionalEnv(name: string, fallback?: string, runtimeEnv?: RuntimeEnvSource): string | undefined {
  return readEnvValue(name, runtimeEnv) ?? fallback;
}

function readRequiredEnv(name: string, runtimeEnv?: RuntimeEnvSource): string {
  const value = readEnvValue(name, runtimeEnv);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumber(name: string, fallback: number, runtimeEnv?: RuntimeEnvSource): number {
  const raw = readOptionalEnv(name, undefined, runtimeEnv);
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export function getPublicEnv() {
  return {
    appName: readOptionalEnv("PUBLIC_APP_NAME", "Modernized Visions SaaS Template") ?? "Modernized Visions SaaS Template",
    companyName: readOptionalEnv("PUBLIC_COMPANY_NAME", "Modernized Visions") ?? "Modernized Visions",
    supportEmail: readOptionalEnv("PUBLIC_SUPPORT_EMAIL", "team@modernizedvisions.agency") ?? "team@modernizedvisions.agency",
  };
}

export function getServerEnv() {
  return {
    appBaseUrl: readOptionalEnv("APP_BASE_URL", "http://localhost:3000") ?? "http://localhost:3000",
    sessionCookieName: readOptionalEnv("SESSION_COOKIE_NAME", "mv_app_session") ?? "mv_app_session",
    sessionTtlDays: readNumber("SESSION_TTL_DAYS", 30),
    passwordResetTokenTtlMinutes: readNumber("PASSWORD_RESET_TOKEN_TTL_MINUTES", 30),
    inviteTokenTtlDays: readNumber("INVITE_TOKEN_TTL_DAYS", 7),
    accountSetupTokenTtlDays: readNumber("ACCOUNT_SETUP_TOKEN_TTL_DAYS", 7),
    stripePriceId: readOptionalEnv("STRIPE_PRICE_ID"),
    stripeSecretKey: readOptionalEnv("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: readOptionalEnv("STRIPE_WEBHOOK_SECRET"),
    resendApiKey: readOptionalEnv("RESEND_API_KEY"),
    appSecret: readOptionalEnv("APP_SECRET"),
    public: getPublicEnv(),
  };
}

export async function getServerRuntimeEnv() {
  const runtimeEnv = await getCloudflareRuntimeEnvAsync();

  return {
    appBaseUrl: readOptionalEnv("APP_BASE_URL", "http://localhost:3000", runtimeEnv) ?? "http://localhost:3000",
    sessionCookieName: readOptionalEnv("SESSION_COOKIE_NAME", "mv_app_session", runtimeEnv) ?? "mv_app_session",
    sessionTtlDays: readNumber("SESSION_TTL_DAYS", 30, runtimeEnv),
    passwordResetTokenTtlMinutes: readNumber("PASSWORD_RESET_TOKEN_TTL_MINUTES", 30, runtimeEnv),
    inviteTokenTtlDays: readNumber("INVITE_TOKEN_TTL_DAYS", 7, runtimeEnv),
    accountSetupTokenTtlDays: readNumber("ACCOUNT_SETUP_TOKEN_TTL_DAYS", 7, runtimeEnv),
    stripePriceId: readOptionalEnv("STRIPE_PRICE_ID", undefined, runtimeEnv),
    stripeSecretKey: readOptionalEnv("STRIPE_SECRET_KEY", undefined, runtimeEnv),
    stripeWebhookSecret: readOptionalEnv("STRIPE_WEBHOOK_SECRET", undefined, runtimeEnv),
    resendApiKey: readOptionalEnv("RESEND_API_KEY", undefined, runtimeEnv),
    appSecret: readOptionalEnv("APP_SECRET", undefined, runtimeEnv),
    public: getPublicEnv(),
  };
}

export function requireConfiguredSecret(name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "RESEND_API_KEY" | "APP_SECRET"): string {
  return readRequiredEnv(name);
}

export function isConfiguredEnvValue(value: string | undefined): value is string {
  return sanitizeEnvValue(value) !== undefined;
}
