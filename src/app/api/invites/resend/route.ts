import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { findInviteById, getOrganizationById } from "@/lib/db/queries/company-users";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { sendInviteUserEmail } from "@/lib/email/utility-emails";
import { getServerEnv } from "@/lib/env";
import { hashToken, randomToken } from "@/lib/auth/tokens";

function buildInviteExpiry(days: number) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  return expiresAt.toISOString();
}

export async function POST(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireOwner(request, { DB: db });
    const body = (await request.json()) as { inviteId?: string };
    if (!body.inviteId) {
      return NextResponse.json({ ok: false, message: "Invite ID is required." }, { status: 400 });
    }

    const invite = await findInviteById(db, body.inviteId);
    if (!invite || invite.organization_id !== auth.organization.id) {
      return NextResponse.json({ ok: false, message: "Invite not found." }, { status: 404 });
    }
    if (invite.accepted_at) {
      return NextResponse.json({ ok: false, message: "This invite has already been accepted." }, { status: 400 });
    }
    if (invite.revoked_at) {
      return NextResponse.json({ ok: false, message: "This invite has been canceled." }, { status: 400 });
    }

    const rawInviteToken = randomToken();
    await db
      .prepare(
        `
          UPDATE organization_invites
          SET token_hash = ?,
              expires_at = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .bind(await hashToken(rawInviteToken), buildInviteExpiry(getServerEnv().inviteTokenTtlDays), invite.id)
      .run();

    const organization = await getOrganizationById(db, invite.organization_id);
    const emailResult = await sendInviteUserEmail(db, {
      to: invite.email,
      inviteToken: rawInviteToken,
      organizationId: invite.organization_id,
      organizationName: organization?.name ?? "Your organization",
      inviterName: auth.user.display_name ?? auth.user.email,
    });

    await createActivityLog(db, {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "invite_resent",
      entityType: "invite",
      entityId: invite.id,
      metadata: { email: invite.email },
    });

    const response: Record<string, unknown> = { ok: true };
    if (!emailResult.ok) {
      response.warning = "Invite resent, but email could not be sent.";
    }
    if (process.env.NODE_ENV !== "production") {
      const { appBaseUrl } = getServerEnv();
      response.devOnlyInviteUrl = `${appBaseUrl}/accept-invite?token=${encodeURIComponent(rawInviteToken)}`;
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resend invite";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
