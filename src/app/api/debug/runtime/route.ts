import { NextResponse } from "next/server";

import { getServerRuntimeEnv, isConfiguredEnvValue } from "@/lib/env";

export async function GET() {
  const env = await getServerRuntimeEnv();

  return NextResponse.json({
    ok: true,
    hasAppBaseUrl: isConfiguredEnvValue(env.appBaseUrl) && env.appBaseUrl !== ".",
    hasStripePriceId: isConfiguredEnvValue(env.stripePriceId),
    hasStripeSecretKey: isConfiguredEnvValue(env.stripeSecretKey),
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
  });
}
