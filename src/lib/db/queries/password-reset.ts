import "server-only";

import type { MinimalD1Database } from "../client";
import type { PasswordHashResult } from "../../auth/password";
import { createPrefixedId } from "../../auth/tokens";

export async function createPasswordResetToken(
  db: MinimalD1Database,
  input: { userId: string; tokenHash: string; expiresAt: string },
) {
  const id = createPrefixedId("prt_");
  await db
    .prepare(
      `
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .bind(id, input.userId, input.tokenHash, input.expiresAt)
    .run();
  return id;
}

export async function findPasswordResetByTokenHash(db: MinimalD1Database, tokenHash: string) {
  return db
    .prepare<{
      id: string;
      user_id: string;
      token_hash: string;
      expires_at: string;
      used_at: string | null;
      created_at: string;
      user_status: string;
    }>(
      `
        SELECT prt.*, u.status AS user_status
        FROM password_reset_tokens prt
        INNER JOIN users u ON u.id = prt.user_id
        WHERE prt.token_hash = ?
        LIMIT 1
      `,
    )
    .bind(tokenHash)
    .first();
}

export async function markPasswordResetTokenUsed(db: MinimalD1Database, tokenId: string) {
  await db
    .prepare("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(tokenId)
    .run();
}

export async function updateUserPassword(
  db: MinimalD1Database,
  userId: string,
  passwordHashResult: PasswordHashResult,
) {
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
      passwordHashResult.password_hash,
      passwordHashResult.password_salt,
      passwordHashResult.password_iters,
      passwordHashResult.password_algo,
      userId,
    )
    .run();
}
