import { NextResponse } from "next/server";

import { isValidEmail } from "@/lib/auth/email";
import { getServerRuntimeEnv, isConfiguredEnvValue } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe/client";

const STRIPE_TIMEOUT_MS = 15_000;

function logCheckoutStage(stage: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`[billing/checkout] ${stage}`, details);
    return;
  }

  console.info(`[billing/checkout] ${stage}`);
}

function createJsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function validateCheckoutConfig(env: Awaited<ReturnType<typeof getServerRuntimeEnv>>) {
  if (!isConfiguredEnvValue(env.appBaseUrl) || env.appBaseUrl === ".") {
    return "APP_BASE_URL";
  }

  if (!isConfiguredEnvValue(env.stripePriceId) || !env.stripePriceId.startsWith("price_")) {
    return "STRIPE_PRICE_ID";
  }

  if (!isConfiguredEnvValue(env.stripeSecretKey) || !env.stripeSecretKey.startsWith("sk_")) {
    return "STRIPE_SECRET_KEY";
  }

  return null;
}

async function parseOptionalJsonBody(request: Request): Promise<{ email?: string }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    const text = await request.text();
    if (!text.trim()) {
      return {};
    }

    const parsed = JSON.parse(text) as { email?: string };
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function createCheckoutSessionWithTimeout(stripe: ReturnType<typeof getStripeClient>, params: Parameters<typeof stripe.checkout.sessions.create>[0]) {
  return await Promise.race([
    stripe.checkout.sessions.create(params),
    new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Stripe checkout session timed out."));
      }, STRIPE_TIMEOUT_MS);

      if (typeof timeoutId === "object" && "unref" in timeoutId && typeof timeoutId.unref === "function") {
        timeoutId.unref();
      }
    }),
  ]);
}

export async function POST(request: Request) {
  logCheckoutStage("checkout route started");

  try {
    const body = await parseOptionalJsonBody(request);

    logCheckoutStage("checkout env read started");
    const env = await getServerRuntimeEnv();
    const invalidConfig = validateCheckoutConfig(env);
    if (invalidConfig) {
      console.error(`[billing/checkout] invalid configuration: ${invalidConfig}`);
      return createJsonError(`Missing or invalid Stripe configuration: ${invalidConfig}`, 500);
    }
    logCheckoutStage("checkout env validation passed");

    const stripe = getStripeClient();
    logCheckoutStage("checkout stripe session create started");
    const session = await createCheckoutSessionWithTimeout(stripe, {
      mode: "subscription",
      line_items: [{ price: env.stripePriceId, quantity: 1 }],
      success_url: `${env.appBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appBaseUrl}/`,
      customer_email: body.email && isValidEmail(body.email) ? body.email.trim() : undefined,
      metadata: {
        app_template: "modernized-visions-saas-template",
        flow: "buy_first_owner_setup",
      },
    });
    logCheckoutStage("checkout stripe session created");

    if (!session.url) {
      console.error("[billing/checkout] stripe session missing url");
      return createJsonError("Stripe checkout session was created without a redirect URL.", 500);
    }

    logCheckoutStage("checkout route returning success");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session.";
    console.error("[billing/checkout] caught error", { message });
    const status = message === "Stripe checkout session timed out." ? 504 : 500;
    return createJsonError(message, status);
  }
}
