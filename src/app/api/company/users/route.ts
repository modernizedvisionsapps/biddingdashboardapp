import { NextResponse } from "next/server";

import { normalizeEmail, isValidEmail } from "@/lib/auth/email";
import { hashToken, randomToken } from "@/lib/auth/tokens";
import { requireOwner } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import {
  createInvite,
  createOrReactivateMembership,
  findMembershipByOrganizationAndUser,
  findUserByNormalizedEmail,
  getOrganizationById,
  listActiveMemberships,
  listInactiveMemberships,
  listPendingInvites,
  updateMembershipRole,
} from "@/lib/db/queries/company-users";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { sendInviteUserEmail } from "@/lib/email/utility-emails";
import { getServerEnv } from "@/lib/env";
import type { MembershipRole } from "@/lib/types";

function buildInviteExpiry(days: number) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  return expiresAt.toISOString();
}

export async function GET(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireOwner(request, { DB: db });
    const [activeUsers, pendingInvites, inactiveUsers] = await Promise.all([
      listActiveMemberships(db, auth.organization.id),
      listPendingInvites(db, auth.organization.id),
      listInactiveMemberships(db, auth.organization.id),
    ]);

    return NextResponse.json({ ok: true, activeUsers, pendingInvites, inactiveUsers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireOwner(request, { DB: db });
    const body = (await request.json()) as { email?: string; role?: MembershipRole };
    const email = body.email?.trim() ?? "";
    const role: MembershipRole = body.role === "owner" ? "owner" : "member";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, message: "A valid email is required." }, { status: 400 });
    }

    const emailNormalized = normalizeEmail(email);
    const existingUser = await findUserByNormalizedEmail(db, emailNormalized);

    if (existingUser) {
      const existingMembership = await findMembershipByOrganizationAndUser(
        db,
        auth.organization.id,
        existingUser.id,
      );

      if (existingMembership?.status === "active") {
        return NextResponse.json({ ok: false, message: "This user already has access." }, { status: 400 });
      }

      if (existingMembership?.status === "removed") {
        await createOrReactivateMembership(db, {
          organizationId: auth.organization.id,
          userId: existingUser.id,
          role,
          invitedByUserId: auth.user.id,
        });
        if (existingMembership.role !== role) {
          await updateMembershipRole(db, existingMembership.id, role);
        }
        await createActivityLog(db, {
          organizationId: auth.organization.id,
          userId: auth.user.id,
          action: "user_reactivated",
          entityType: "membership",
          entityId: existingMembership.id,
          metadata: { targetUserId: existingUser.id, role },
        });

        return NextResponse.json({ ok: true, message: "User reactivated successfully." });
      }
    }

    const pendingInvites = await listPendingInvites(db, auth.organization.id);
    const alreadyPending = pendingInvites.find((invite) => normalizeEmail(invite.email) === emailNormalized);
    if (alreadyPending) {
      return NextResponse.json({ ok: false, message: "An invite is already pending for this email." }, { status: 400 });
    }

    const rawInviteToken = randomToken();
    const tokenHash = await hashToken(rawInviteToken);
    const inviteId = await createInvite(db, {
      organizationId: auth.organization.id,
      email,
      emailNormalized,
      role,
      tokenHash,
      expiresAt: buildInviteExpiry(getServerEnv().inviteTokenTtlDays),
      invitedByUserId: auth.user.id,
    });

    const organization = await getOrganizationById(db, auth.organization.id);
    await createActivityLog(db, {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "user_invited",
      entityType: "invite",
      entityId: inviteId,
      metadata: { email, role },
    });

    const emailResult = await sendInviteUserEmail(db, {
      to: email,
      inviteToken: rawInviteToken,
      organizationId: auth.organization.id,
      userId: existingUser?.id ?? null,
      organizationName: organization?.name ?? "Your organization",
      inviterName: auth.user.display_name ?? auth.user.email,
    });

    const response: Record<string, unknown> = { ok: true };
    if (!emailResult.ok) {
      response.warning = "Invite created, but email could not be sent.";
    }
    if (process.env.NODE_ENV !== "production") {
      const { appBaseUrl } = getServerEnv();
      response.devOnlyInviteUrl = `${appBaseUrl}/accept-invite?token=${encodeURIComponent(rawInviteToken)}`;
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invite";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
