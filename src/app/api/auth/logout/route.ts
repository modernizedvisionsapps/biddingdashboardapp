import { NextResponse } from "next/server";

import { getRuntimeDb } from "@/lib/db/client";
import { getSessionCookieName, hashSessionToken } from "@/lib/auth/session";

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  try {
    const db = getRuntimeDb();
    const rawToken = readCookie(request.headers.get("cookie"), getSessionCookieName());
    if (rawToken) {
      const tokenHash = await hashSessionToken(rawToken);
      await db
        .prepare(
          `
            UPDATE sessions
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE session_token_hash = ?
              AND revoked_at IS NULL
          `,
        )
        .bind(tokenHash)
        .run();
    }
  } catch {
    return response;
  }

  return response;
}
