import "server-only";

import type { EmailLogStatus } from "../../db/types";
import type { MinimalD1Database } from "../client";
import { createPrefixedId } from "../../auth/tokens";

export async function createEmailLog(
  db: MinimalD1Database,
  input: {
    organizationId: string | null;
    userId: string | null;
    toEmail: string;
    fromEmail: string | null;
    subject: string;
    templateKey: string | null;
    status: EmailLogStatus;
    provider: string | null;
    payloadJson: string | null;
  },
): Promise<string> {
  const id = createPrefixedId("elog_");
  await db
    .prepare(
      `
        INSERT INTO email_logs (
          id, organization_id, user_id, to_email, from_email, subject, template_key,
          status, provider, payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      id,
      input.organizationId,
      input.userId,
      input.toEmail,
      input.fromEmail,
      input.subject,
      input.templateKey,
      input.status,
      input.provider,
      input.payloadJson,
    )
    .run();

  return id;
}

export async function markEmailLogSent(
  db: MinimalD1Database,
  emailLogId: string,
  providerMessageId: string | null,
) {
  await db
    .prepare(
      `
        UPDATE email_logs
        SET status = 'sent',
            provider_message_id = ?,
            sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(providerMessageId, emailLogId)
    .run();
}

export async function markEmailLogFailed(
  db: MinimalD1Database,
  emailLogId: string,
  errorMessage: string,
) {
  await db
    .prepare(
      `
        UPDATE email_logs
        SET status = 'failed',
            error_message = ?
        WHERE id = ?
      `,
    )
    .bind(errorMessage, emailLogId)
    .run();
}
