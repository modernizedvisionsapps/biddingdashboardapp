import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { getServerEnv } from "@/lib/env";
import { getRuntimeDb } from "@/lib/db/client";
import { createActivityLog } from "@/lib/db/queries/activity-log";
import { findUserByNormalizedEmail } from "@/lib/db/queries/auth";
import { createPasswordResetToken } from "@/lib/db/queries/password-reset";
import { hashToken, randomToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email/utility-emails";

const GENERIC_SUCCESS = "If an account exists, a reset link has been sent.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, message: "A valid email is required." }, { status: 400 });
    }

    const db = getRuntimeDb();
    const user = await findUserByNormalizedEmail(db, normalizeEmail(email));
    if (user?.status === "active") {
      const rawToken = randomToken();
      const expiresAt = new Date(Date.now() + getServerEnv().passwordResetTokenTtlMinutes * 60 * 1000).toISOString();
      await createPasswordResetToken(db, {
        userId: user.id,
        tokenHash: await hashToken(rawToken),
        expiresAt,
      });
      await sendPasswordResetEmail(db, {
        to: user.email,
        resetToken: rawToken,
        userId: user.id,
      });
      await createActivityLog(db, {
        userId: user.id,
        action: "password_reset_requested",
        entityType: "user",
        entityId: user.id,
      });
    }

    return NextResponse.json({ ok: true, message: GENERIC_SUCCESS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to request password reset." },
      { status: 500 },
    );
  }
}
