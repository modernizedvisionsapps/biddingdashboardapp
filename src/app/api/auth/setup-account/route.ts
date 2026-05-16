import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import {
  buildSessionCookieOptions,
  createSessionToken,
  getSessionCookieName,
  hashSessionToken,
} from "@/lib/auth/session";
import { getRuntimeDb } from "@/lib/db/client";
import { completeAccountSetup, findAccountSetupContextByTokenHash, markAccountSetupTokenUsed } from "@/lib/db/queries/account-setup";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { createSession } from "@/lib/db/queries/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      password?: string;
      confirmPassword?: string;
    };
    const token = body.token?.trim() ?? "";
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const companyName = body.companyName?.trim() ?? "";
    const password = body.password ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!token || !firstName || !lastName || !companyName || !password || !confirmPassword) {
      return NextResponse.json({ ok: false, message: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 });
    }

    const db = getRuntimeDb();
    const context = await findAccountSetupContextByTokenHash(db, await hashToken(token));
    if (
      !context ||
      context.used_at ||
      context.expires_at <= new Date().toISOString() ||
      !context.membership_id ||
      context.membership_role !== "owner" ||
      context.membership_status !== "active"
    ) {
      return NextResponse.json({ ok: false, message: "This setup link is invalid or expired." }, { status: 400 });
    }

    await completeAccountSetup(db, {
      userId: context.user_id,
      organizationId: context.organization_id,
      firstName,
      lastName,
      companyName,
      password: await hashPassword(password),
    });
    await markAccountSetupTokenUsed(db, context.token_id);
    await createActivityLog(db, {
      organizationId: context.organization_id,
      userId: context.user_id,
      action: "account_setup_completed",
      entityType: "organization",
      entityId: context.organization_id,
    });

    const rawSessionToken = createSessionToken();
    await createSession(db, {
      userId: context.user_id,
      sessionTokenHash: await hashSessionToken(rawSessionToken),
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json({ ok: true, redirectTo: "/app" });
    response.cookies.set(getSessionCookieName(), rawSessionToken, buildSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to set up account." },
      { status: 500 },
    );
  }
}
