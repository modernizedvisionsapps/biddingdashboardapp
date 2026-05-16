import { NextResponse } from "next/server";

import { getRuntimeDb } from "@/lib/db/client";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { createUserShell, findUserByNormalizedEmail } from "@/lib/db/queries/auth";
import { createOrReactivateMembership, findMembershipByOrganizationAndUser } from "@/lib/db/queries/company-users";
import { getServerEnv } from "@/lib/env";
import { sendAccountSetupEmail } from "@/lib/email/utility-emails";
import { normalizeEmail } from "@/lib/auth/email";
import { createPrefixedId, hashToken, randomToken } from "@/lib/auth/tokens";
import { getStripeClient } from "@/lib/stripe/client";
import { verifyStripeWebhook } from "@/lib/stripe/webhook";
import type { OrganizationSubscriptionStatus } from "@/lib/db/types";

function normalizeSubscriptionStatus(status: string | null | undefined): OrganizationSubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "unpaid":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
      return status;
    default:
      return "pending";
  }
}

function getReadonlyReason(status: OrganizationSubscriptionStatus): string | null {
  switch (status) {
    case "active":
    case "trialing":
      return null;
    case "pending":
      return "subscription_pending";
    case "past_due":
    case "unpaid":
      return "payment_failed";
    case "incomplete":
      return "subscription_incomplete";
    case "incomplete_expired":
      return "subscription_incomplete_expired";
    case "canceled":
      return "subscription_canceled";
    default:
      return "subscription_pending";
  }
}

async function resolveCheckoutSubscriptionStatus(session: { subscription?: string | null | { id?: string; status?: string | null } }) {
  if (!session.subscription) {
    return { subscriptionId: null, subscriptionStatus: "pending" as OrganizationSubscriptionStatus };
  }

  if (typeof session.subscription === "object") {
    return {
      subscriptionId: session.subscription.id ?? null,
      subscriptionStatus: normalizeSubscriptionStatus(session.subscription.status),
    };
  }

  const subscription = await getStripeClient().subscriptions.retrieve(session.subscription);
  return {
    subscriptionId: subscription.id,
    subscriptionStatus: normalizeSubscriptionStatus(subscription.status),
  };
}

async function createOrganization(db: ReturnType<typeof getRuntimeDb>, input: {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string;
  subscriptionStatus: OrganizationSubscriptionStatus;
}) {
  const existing = await db
    .prepare<{ id: string }>("SELECT id FROM organizations WHERE stripe_checkout_session_id = ? LIMIT 1")
    .bind(input.stripeCheckoutSessionId)
    .first();

  if (existing) {
    await db
      .prepare(
        `
          UPDATE organizations
          SET stripe_customer_id = ?,
              stripe_subscription_id = ?,
              subscription_status = ?,
              readonly_reason = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .bind(
        input.stripeCustomerId,
        input.stripeSubscriptionId,
        input.subscriptionStatus,
        getReadonlyReason(input.subscriptionStatus),
        existing.id,
      )
      .run();
    return existing.id;
  }

  const organizationId = createPrefixedId("org_");
  await db
    .prepare(
      `
        INSERT INTO organizations (
          id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
          subscription_status, plan_key, readonly_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'default', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      organizationId,
      input.stripeCustomerId,
      input.stripeSubscriptionId,
      input.stripeCheckoutSessionId,
      input.subscriptionStatus,
      getReadonlyReason(input.subscriptionStatus),
    )
    .run();

  return organizationId;
}

export async function POST(request: Request) {
  try {
    const { event, rawBody } = await verifyStripeWebhook(request);
    const db = getRuntimeDb();
    console.info("[stripe/webhook] received event", { eventType: event.type, eventId: event.id });

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
        console.info("[stripe/webhook] checkout.session.completed skipped", {
          eventId: event.id,
          hasEmail: Boolean(email),
          mode: session.mode,
        });
        return NextResponse.json({ received: true });
      }

      const { subscriptionId, subscriptionStatus } = await resolveCheckoutSubscriptionStatus(session);
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
        stripeSubscriptionId: subscriptionId,
        stripeCheckoutSessionId: session.id,
        subscriptionStatus,
      });
      console.info("[stripe/webhook] organization prepared from checkout session", {
        eventId: event.id,
        organizationId,
        stripeCheckoutSessionId: session.id,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus,
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
        metadata: { stripeEventId: event.id, stripeSubscriptionId: subscriptionId, subscriptionStatus },
      });
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const normalizedStatus =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : normalizeSubscriptionStatus(subscription.status);
      const readonlyReason = getReadonlyReason(normalizedStatus);

      await db
        .prepare(
          `
            UPDATE organizations
            SET subscription_status = ?,
                readonly_reason = ?,
                stripe_customer_id = COALESCE(?, stripe_customer_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = ?
          `,
        )
        .bind(
          normalizedStatus,
          readonlyReason,
          typeof subscription.customer === "string" ? subscription.customer : null,
          subscriptionId,
        )
        .run();
      console.info("[stripe/webhook] subscription synced", {
        eventId: event.id,
        subscriptionId,
        subscriptionStatus: normalizedStatus,
      });
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
        console.info("[stripe/webhook] invoice payment failed", {
          eventId: event.id,
          subscriptionId,
        });
      }
    }

    await db
      .prepare("UPDATE billing_events SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE stripe_event_id = ?")
      .bind(event.id)
      .run();

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process webhook.";
    console.error("[stripe/webhook] processing failed", { message });
    const status = message.includes("signature") ? 400 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
