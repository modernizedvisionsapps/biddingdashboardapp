import { NextResponse } from "next/server";

import { requireOwner, makeAuthErrorResponse } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { getOrganizationBillingSummary } from "@/lib/db/queries/billing";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { getServerEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe/client";

export async function POST(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireOwner(request, { DB: db }, "Only owners can manage billing.");
    const organization = await getOrganizationBillingSummary(db, auth.organization.id);

    if (!organization?.stripe_customer_id) {
      return NextResponse.json(
        { ok: false, message: "No billing customer is connected to this account." },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: `${getServerEnv().appBaseUrl}/app/settings/billing`,
    });

    await createActivityLog(db, {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "billing_portal_opened",
      entityType: "organization",
      entityId: auth.organization.id,
      metadata: { stripeCustomerId: organization.stripe_customer_id },
    });

    return NextResponse.json({ ok: true, url: portalSession.url });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to create billing portal session.");
  }
}
