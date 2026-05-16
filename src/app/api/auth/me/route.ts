import { NextResponse } from "next/server";

import { getRuntimeDb } from "@/lib/db/client";
import { getAuthContextFromRequest } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  try {
    const auth = await getAuthContextFromRequest(request, { DB: getRuntimeDb() });
    if (!auth) {
      return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        first_name: auth.user.first_name,
        last_name: auth.user.last_name,
        display_name: auth.user.display_name,
      },
      organization: {
        id: auth.organization.id,
        name: auth.organization.name,
        subscription_status: auth.organization.subscription_status,
        readonly_reason: auth.organization.readonly_reason,
      },
      membership: {
        id: auth.membership.id,
        role: auth.membership.role,
        status: auth.membership.status,
      },
      permissions: {
        canRead: auth.canRead,
        canWrite: auth.canWrite,
        canUseAutomations: auth.canUseAutomations,
        isOwner: auth.isOwner,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load auth context" },
      { status: 500 },
    );
  }
}
