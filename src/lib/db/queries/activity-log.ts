import "server-only";

import type { MinimalD1Database } from "../client";
import { createPrefixedId } from "../../auth/tokens";

export async function createActivityLog(
  db: MinimalD1Database,
  input: {
    organizationId?: string | null;
    userId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  await db
    .prepare(
      `
        INSERT INTO activity_log (
          id, organization_id, user_id, action, entity_type, entity_id, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      createPrefixedId("act_"),
      input.organizationId ?? null,
      input.userId ?? null,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    )
    .run();
}
