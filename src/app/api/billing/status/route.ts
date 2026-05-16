import { NextResponse } from "next/server";

import { requireAuth, makeAuthErrorResponse } from "@/lib/auth/require-auth";
import { getSubscriptionAccessLabel, getSubscriptionStatusMessage } from "@/lib/auth/permissions";
import { getRuntimeDb } from "@/lib/db/client";
import { getOrganizationBillingSummary } from "@/lib/db/queries/billing";

export async function GET(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const organization = await getOrganizationBillingSummary(db, auth.organization.id);

    return NextResponse.json({
      ok: true,
      organization: {
        id: auth.organization.id,
        name: organization?.name ?? auth.organization.name,
        subscription_status: auth.organization.subscription_status,
        readonly_reason: auth.organization.readonly_reason,
        stripe_customer_id: organization?.stripe_customer_id ?? auth.organization.stripe_customer_id,
      },
      permissions: {
        canRead: auth.canRead,
        canWrite: auth.canWrite,
        canUseAutomations: auth.canUseAutomations,
        isOwner: auth.isOwner,
      },
      accessLabel: getSubscriptionAccessLabel(auth.organization.subscription_status),
      statusMessage: getSubscriptionStatusMessage(auth.organization.subscription_status),
    });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load billing status.");
  }
}
