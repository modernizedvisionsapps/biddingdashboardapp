import { NextResponse } from "next/server";

import { requireAuth, requireOwner } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { getCompanySettingsContext, updateOrganizationName } from "@/lib/db/queries/company-users";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { createSlugFromName } from "@/lib/company/slug";

export async function GET(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const context = await getCompanySettingsContext(db, auth);
    return NextResponse.json({ ok: true, ...context });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load company";
    const status = message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireOwner(request, { DB: db });
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ ok: false, message: "Company name is required." }, { status: 400 });
    }

    await updateOrganizationName(db, auth.organization.id, name, createSlugFromName(name));
    await createActivityLog(db, {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "company_name_updated",
      entityType: "organization",
      entityId: auth.organization.id,
      metadata: { name },
    });

    const context = await getCompanySettingsContext(db, auth);
    return NextResponse.json({ ok: true, ...context });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update company";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
