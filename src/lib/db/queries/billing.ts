import "server-only";

import type { MinimalD1Database } from "../client";

export async function getOrganizationBillingSummary(db: MinimalD1Database, organizationId: string) {
  return db
    .prepare(
      `
        SELECT
          id,
          name,
          subscription_status,
          readonly_reason,
          stripe_customer_id
        FROM organizations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(organizationId)
    .first<{
      id: string;
      name: string | null;
      subscription_status: string;
      readonly_reason: string | null;
      stripe_customer_id: string | null;
    }>();
}
