import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { verifyPassword } from "@/lib/auth/password";
import {
  buildSessionCookieOptions,
  createSessionToken,
  getSessionCookieName,
  hashSessionToken,
} from "@/lib/auth/session";
import { getRuntimeDb } from "@/lib/db/client";
import { createSession, findUserByNormalizedEmail, updateLastLogin } from "@/lib/db/queries/auth";

export async function POST(request: Request) {
  try {
    const db = getRuntimeDb();
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 400 });
    }

    const user = await findUserByNormalizedEmail(db, normalizeEmail(email));
    if (!user || user.status !== "active" || !user.password_hash || !user.password_salt || !user.password_iters || !user.password_algo) {
      return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 400 });
    }

    const valid = await verifyPassword(password, {
      password_hash: user.password_hash,
      password_salt: user.password_salt,
      password_iters: user.password_iters,
      password_algo: user.password_algo,
    });

    if (!valid) {
      return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 400 });
    }

    const rawSessionToken = createSessionToken();
    await createSession(db, {
      userId: user.id,
      sessionTokenHash: await hashSessionToken(rawSessionToken),
      userAgent: request.headers.get("user-agent"),
    });
    await updateLastLogin(db, user.id);

    const response = NextResponse.json({ ok: true, redirectTo: "/app" });
    response.cookies.set(getSessionCookieName(), rawSessionToken, buildSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to sign in." },
      { status: 500 },
    );
  }
}
