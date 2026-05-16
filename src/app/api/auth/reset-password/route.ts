import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { getRuntimeDb } from "@/lib/db/client";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { revokeAllSessionsForUser } from "@/lib/db/queries/auth";
import {
  findPasswordResetByTokenHash,
  markPasswordResetTokenUsed,
  updateUserPassword,
} from "@/lib/db/queries/password-reset";

function invalidResetResponse() {
  return NextResponse.json(
    { ok: false, message: "This reset link is invalid or expired." },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string; confirmPassword?: string };
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ ok: false, message: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 });
    }

    const db = getRuntimeDb();
    const resetToken = await findPasswordResetByTokenHash(db, await hashToken(token));
    if (!resetToken || resetToken.used_at || resetToken.expires_at <= new Date().toISOString() || resetToken.user_status !== "active") {
      return invalidResetResponse();
    }

    await updateUserPassword(db, resetToken.user_id, await hashPassword(password));
    await markPasswordResetTokenUsed(db, resetToken.id);
    await revokeAllSessionsForUser(db, resetToken.user_id);
    await createActivityLog(db, {
      userId: resetToken.user_id,
      action: "password_reset_completed",
      entityType: "user",
      entityId: resetToken.user_id,
    });

    return NextResponse.json({ ok: true, message: "Password reset successfully.", redirectTo: "/login" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to reset password." },
      { status: 500 },
    );
  }
}
