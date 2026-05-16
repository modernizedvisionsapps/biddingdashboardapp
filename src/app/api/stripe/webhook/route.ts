import { NextResponse } from "next/server";

import { getRuntimeDb } from "@/lib/db/client";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { createUserShell, findUserByNormalizedEmail } from "@/lib/db/queries/auth";
import { createOrReactivateMembership, findMembershipByOrganizationAndUser } from "@/lib/db/queries/company-users";
import { getServerEnv } from "@/lib/env";
import { sendAccountSetupEmail } from "@/lib/email/utility-emails";
import { normalizeEmail } from "@/lib/auth/email";
import { createPrefixedId, hashToken, randomToken } from "@/lib/auth/tokens";
import { verifyStripeWebhook } from "@/lib/stripe/webhook";

function deriveSubscriptionStatus(status: string | null | undefined) {
  return status ?? "active";
}

async function createOrganization(db: ReturnType<typeof getRuntimeDb>, input: {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string;
  subscriptionStatus: string;
}) {
  const existing = await db
    .prepare<{ id: string }>("SELECT id FROM organizations WHERE stripe_checkout_session_id = ? LIMIT 1")
    .bind(input.stripeCheckoutSessionId)
    .first();

  if (existing) {
    return existing.id;
  }

  const organizationId = createPrefixedId("org_");
  await db
    .prepare(
      `
        INSERT INTO organizations (
          id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
          subscription_status, plan_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      organizationId,
      input.stripeCustomerId,
      input.stripeSubscriptionId,
      input.stripeCheckoutSessionId,
      input.subscriptionStatus,
    )
    .run();

  return organizationId;
}

export async function POST(request: Request) {
  try {
    const { event, rawBody } = await verifyStripeWebhook(request);
    const db = getRuntimeDb();

    await db
      .prepare(
        `
          INSERT OR IGNORE INTO billing_events (
            id, stripe_event_id, stripe_event_type, status, payload_json, created_at
          ) VALUES (?, ?, ?, 'received', ?, CURRENT_TIMESTAMP)
        `,
      )
      .bind(createPrefixedId("bill_"), event.id, event.type, rawBody)
      .run();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email ?? session.customer_email;
      if (!email || session.mode !== "subscription") {
        return NextResponse.json({ received: true });
      }

      const emailNormalized = normalizeEmail(email);
      let user = await findUserByNormalizedEmail(db, emailNormalized);
      if (!user) {
        const userId = await createUserShell(db, email, emailNormalized);
        user = await findUserByNormalizedEmail(db, emailNormalized);
        if (!user) {
          throw new Error(`Failed to create user ${userId}`);
        }
      }

      const organizationId = await createOrganization(db, {
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
        stripeCheckoutSessionId: session.id,
        subscriptionStatus: deriveSubscriptionStatus(session.status),
      });

      const membership = await findMembershipByOrganizationAndUser(db, organizationId, user.id);
      if (!membership || membership.status !== "active") {
        await createOrReactivateMembership(db, {
          organizationId,
          userId: user.id,
          role: "owner",
        });
      }

      const rawSetupToken = randomToken();
      await db
        .prepare(
          `
            INSERT INTO account_setup_tokens (
              id, organization_id, user_id, token_hash, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
        )
        .bind(
          createPrefixedId("setup_"),
          organizationId,
          user.id,
          await hashToken(rawSetupToken),
          new Date(Date.now() + getServerEnv().accountSetupTokenTtlDays * 24 * 60 * 60 * 1000).toISOString(),
        )
        .run();

      await sendAccountSetupEmail(db, {
        to: user.email,
        setupToken: rawSetupToken,
        organizationId,
        userId: user.id,
      });
      await createActivityLog(db, {
        organizationId,
        userId: user.id,
        action: "subscription_created",
        entityType: "organization",
        entityId: organizationId,
        metadata: { stripeEventId: event.id },
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      await db
        .prepare(
          `
            UPDATE organizations
            SET subscription_status = ?,
                readonly_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = ?
          `,
        )
        .bind(
          event.type === "customer.subscription.deleted" ? "canceled" : deriveSubscriptionStatus(subscription.status),
          event.type === "customer.subscription.deleted" ? "subscription_canceled" : null,
          subscriptionId,
        )
        .run();
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as { subscription?: string | { id?: string } | null };
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;
      if (subscriptionId) {
        await db
          .prepare(
            `
              UPDATE organizations
              SET subscription_status = 'past_due',
                  readonly_reason = 'payment_failed',
                  updated_at = CURRENT_TIMESTAMP
              WHERE stripe_subscription_id = ?
            `,
          )
          .bind(subscriptionId)
          .run();
      }
    }

    await db
      .prepare("UPDATE billing_events SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE stripe_event_id = ?")
      .bind(event.id)
      .run();

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process webhook.";
    const status = message.includes("signature") ? 400 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
