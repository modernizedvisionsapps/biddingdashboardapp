import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import {
  countActiveOwners,
  findMembershipById,
  reactivateMembership,
  removeMembership,
  updateMembershipRole,
} from "@/lib/db/queries/company-users";
import { createActivityLog } from "@/lib/db/queries/activity-log";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireOwner(request, { DB: db });
    const { membershipId } = await context.params;
    const body = (await request.json()) as { action?: string };
    const membership = await findMembershipById(db, membershipId);

    if (!membership || membership.organization_id !== auth.organization.id) {
      return NextResponse.json({ ok: false, message: "Membership not found." }, { status: 404 });
    }

    const isTargetOwner = membership.role === "owner" && membership.status === "active";
    const activeOwners = isTargetOwner
      ? await countActiveOwners(db, auth.organization.id)
      : 0;

    if ((body.action === "demote_to_member" || body.action === "remove") && isTargetOwner && activeOwners <= 1) {
      return NextResponse.json(
        { ok: false, message: "The last active owner cannot be removed or demoted." },
        { status: 400 },
      );
    }

    switch (body.action) {
      case "promote_to_owner":
        await updateMembershipRole(db, membership.id, "owner");
        await createActivityLog(db, {
          organizationId: auth.organization.id,
          userId: auth.user.id,
          action: "user_promoted_to_owner",
          entityType: "membership",
          entityId: membership.id,
          metadata: { targetUserId: membership.user_id },
        });
        break;
      case "demote_to_member":
        await updateMembershipRole(db, membership.id, "member");
        await createActivityLog(db, {
          organizationId: auth.organization.id,
          userId: auth.user.id,
          action: "user_demoted_to_member",
          entityType: "membership",
          entityId: membership.id,
          metadata: { targetUserId: membership.user_id },
        });
        break;
      case "remove":
        await removeMembership(db, membership.id, auth.user.id);
        await createActivityLog(db, {
          organizationId: auth.organization.id,
          userId: auth.user.id,
          action: "user_removed",
          entityType: "membership",
          entityId: membership.id,
          metadata: { targetUserId: membership.user_id },
        });
        break;
      case "reactivate":
        await reactivateMembership(db, membership.id);
        await createActivityLog(db, {
          organizationId: auth.organization.id,
          userId: auth.user.id,
          action: "user_reactivated",
          entityType: "membership",
          entityId: membership.id,
          metadata: { targetUserId: membership.user_id },
        });
        break;
      default:
        return NextResponse.json({ ok: false, message: "Unsupported action." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update membership";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, message: "Use PATCH with action=remove instead." },
    { status: 405 },
  );
}
