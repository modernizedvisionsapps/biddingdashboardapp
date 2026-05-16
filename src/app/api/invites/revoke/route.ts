import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { findInviteById, revokeInvite } from "@/lib/db/queries/company-users";
import { createActivityLog } from "@/lib/db/queries/activity-log";

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
      return NextResponse.json({ ok: false, message: "Accepted invites cannot be canceled." }, { status: 400 });
    }

    await revokeInvite(db, invite.id);
    await createActivityLog(db, {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "invite_revoked",
      entityType: "invite",
      entityId: invite.id,
      metadata: { email: invite.email },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke invite";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
