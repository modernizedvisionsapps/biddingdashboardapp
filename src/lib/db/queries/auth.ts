import "server-only";

import type { MinimalD1Database } from "../client";
import type { PasswordHashResult } from "../../auth/password";
import type { User } from "../../db/types";
import { createSessionId, getSessionTtlSeconds } from "../../auth/session";
import { createPrefixedId } from "../../auth/tokens";

export async function findUserByNormalizedEmail(db: MinimalD1Database, emailNormalized: string) {
  return db
    .prepare<User>("SELECT * FROM users WHERE email_normalized = ? LIMIT 1")
    .bind(emailNormalized)
    .first();
}

export async function createSession(
  db: MinimalD1Database,
  input: {
    userId: string;
    sessionTokenHash: string;
    userAgent: string | null;
    ipHash?: string | null;
  },
) {
  const id = createSessionId();
  const expiresAt = new Date(Date.now() + getSessionTtlSeconds() * 1000).toISOString();
  await db
    .prepare(
      `
        INSERT INTO sessions (
          id, user_id, session_token_hash, expires_at, created_at, last_seen_at, user_agent, ip_hash
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
      `,
    )
    .bind(id, input.userId, input.sessionTokenHash, expiresAt, input.userAgent, input.ipHash ?? null)
    .run();
  return { id, expiresAt };
}

export async function revokeSessionByTokenHash(db: MinimalD1Database, tokenHash: string) {
  await db
    .prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_token_hash = ? AND revoked_at IS NULL")
    .bind(tokenHash)
    .run();
}

export async function revokeAllSessionsForUser(db: MinimalD1Database, userId: string) {
  await db
    .prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL")
    .bind(userId)
    .run();
}

export async function updateLastLogin(db: MinimalD1Database, userId: string) {
  await db
    .prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(userId)
    .run();
}

export async function updateUserPassword(db: MinimalD1Database, userId: string, password: PasswordHashResult) {
  await db
    .prepare(
      `
        UPDATE users
        SET password_hash = ?,
            password_salt = ?,
            password_iters = ?,
            password_algo = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      password.password_hash,
      password.password_salt,
      password.password_iters,
      password.password_algo,
      userId,
    )
    .run();
}

export async function createUserShell(db: MinimalD1Database, email: string, emailNormalized: string) {
  const id = createPrefixedId("user_");
  await db
    .prepare(
      `
        INSERT INTO users (id, email, email_normalized, status, created_at, updated_at)
        VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(id, email, emailNormalized)
    .run();
  return id;
}
