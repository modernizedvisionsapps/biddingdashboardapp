import "server-only";

import type { MinimalD1Database } from "../client";
import type { PasswordHashResult } from "../../auth/password";
import { createSlugFromName } from "../../company/slug";

export async function findAccountSetupContextByTokenHash(db: MinimalD1Database, tokenHash: string) {
  return db
    .prepare<{
      token_id: string;
      organization_id: string;
      user_id: string;
      expires_at: string;
      used_at: string | null;
      membership_id: string | null;
      membership_role: string | null;
      membership_status: string | null;
    }>(
      `
        SELECT
          ast.id AS token_id,
          ast.organization_id,
          ast.user_id,
          ast.expires_at,
          ast.used_at,
          m.id AS membership_id,
          m.role AS membership_role,
          m.status AS membership_status
        FROM account_setup_tokens ast
        LEFT JOIN organization_memberships m
          ON m.organization_id = ast.organization_id
         AND m.user_id = ast.user_id
        WHERE ast.token_hash = ?
        LIMIT 1
      `,
    )
    .bind(tokenHash)
    .first();
}

export async function markAccountSetupTokenUsed(db: MinimalD1Database, tokenId: string) {
  await db
    .prepare("UPDATE account_setup_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(tokenId)
    .run();
}

export async function completeAccountSetup(
  db: MinimalD1Database,
  input: {
    userId: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    companyName: string;
    password: PasswordHashResult;
  },
) {
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
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      input.firstName,
      input.lastName,
      `${input.firstName} ${input.lastName}`.trim(),
      input.password.password_hash,
      input.password.password_salt,
      input.password.password_iters,
      input.password.password_algo,
      input.userId,
    )
    .run();

  await db
    .prepare(
      `
        UPDATE organizations
        SET name = ?,
            slug = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(input.companyName, createSlugFromName(input.companyName), input.organizationId)
    .run();
}
