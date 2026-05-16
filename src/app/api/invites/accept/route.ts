import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import {
  buildSessionCookieOptions,
  createSessionId,
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  hashSessionToken,
} from "@/lib/auth/session";
import { getRuntimeDb } from "@/lib/db/client";
import {
  createOrReactivateMembership,
  createUserForInvite,
  findInviteByTokenHash,
  findMembershipByOrganizationAndUser,
  findUserByNormalizedEmail,
  markInviteAccepted,
} from "@/lib/db/queries/company-users";
import { createActivityLog } from "@/lib/db/queries/activity-log";

function invalidInviteResponse() {
  return NextResponse.json(
    { ok: false, message: "This invite link is invalid or expired." },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const db = getRuntimeDb();
    const body = (await request.json()) as {
      token?: string;
      firstName?: string;
      lastName?: string;
      password?: string;
      confirmPassword?: string;
    };

    const token = body.token?.trim() ?? "";
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const password = body.password ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!token || !firstName || !lastName || !password || !confirmPassword) {
      return NextResponse.json({ ok: false, message: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 });
    }

    const invite = await findInviteByTokenHash(db, await hashToken(token));
    if (!invite || invite.accepted_at || invite.revoked_at || invite.expires_at <= new Date().toISOString()) {
      return invalidInviteResponse();
    }

    const existingUser = await findUserByNormalizedEmail(db, invite.email_normalized);
    let userId = existingUser?.id ?? null;

    if (existingUser?.password_hash) {
      const existingMembership = await findMembershipByOrganizationAndUser(db, invite.organization_id, existingUser.id);
      if (existingMembership?.status === "active") {
        return NextResponse.json({ ok: false, message: "This user already has access." }, { status: 400 });
      }

      return NextResponse.json(
        { ok: false, message: "This email already has an account. Please sign in, then accept the invite." },
        { status: 400 },
      );
    }

    if (!existingUser) {
      const passwordHash = await hashPassword(password);
      userId = await createUserForInvite(db, {
        email: invite.email,
        emailNormalized: invite.email_normalized,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        passwordHash: passwordHash.password_hash,
        passwordSalt: passwordHash.password_salt,
        passwordIters: passwordHash.password_iters,
        passwordAlgo: passwordHash.password_algo,
      });
    } else {
      const passwordHash = await hashPassword(password);
      await db
        .prepare(
          `
            UPDATE users
            SET first_name = ?,
                last_name = ?,
                display_name = ?,
                password_hash = ?,
                password_salt = ?,
                password_iters = ?,
                password_algo = ?,
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
        )
        .bind(
          firstName,
          lastName,
          `${firstName} ${lastName}`.trim(),
          passwordHash.password_hash,
          passwordHash.password_salt,
          passwordHash.password_iters,
          passwordHash.password_algo,
          existingUser.id,
        )
        .run();
        userId = existingUser.id;
    }

    const membershipId = await createOrReactivateMembership(db, {
      organizationId: invite.organization_id,
      userId: userId!,
      role: invite.role,
      invitedByUserId: invite.invited_by_user_id,
    });
    await markInviteAccepted(db, invite.id, userId!);

    const rawSessionToken = createSessionToken();
    const sessionTokenHash = await hashSessionToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + getSessionTtlSeconds() * 1000).toISOString();

    await db
      .prepare(
        `
          INSERT INTO sessions (
            id, user_id, session_token_hash, expires_at, created_at, last_seen_at, user_agent
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        `,
      )
      .bind(createSessionId(), userId, sessionTokenHash, expiresAt, request.headers.get("user-agent"))
      .run();

    await createActivityLog(db, {
      organizationId: invite.organization_id,
      userId,
      action: "invite_accepted",
      entityType: "membership",
      entityId: membershipId,
      metadata: { inviteId: invite.id },
    });

    const response = NextResponse.json({ ok: true, redirectTo: "/app" });
    response.cookies.set(getSessionCookieName(), rawSessionToken, buildSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to accept invite." },
      { status: 500 },
    );
  }
}
