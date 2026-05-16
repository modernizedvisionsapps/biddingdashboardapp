import "server-only";

import type Stripe from "stripe";

import { requireConfiguredSecret } from "../env";
import { getStripeClient } from "./client";

export async function verifyStripeWebhook(request: Request): Promise<{ event: Stripe.Event; rawBody: string }> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new Error("Missing Stripe signature.");
  }

  const rawBody = await request.text();
  const event = await getStripeClient().webhooks.constructEventAsync(
    rawBody,
    signature,
    requireConfiguredSecret("STRIPE_WEBHOOK_SECRET"),
  );

  return { event, rawBody };
}
