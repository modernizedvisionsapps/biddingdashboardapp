import "server-only";

import Stripe from "stripe";

import { requireConfiguredSecret } from "../env";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  stripeClient = new Stripe(requireConfiguredSecret("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-04-22.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 0,
    timeout: 15_000,
  });

  return stripeClient;
}
