import "server-only";

import { Resend } from "resend";

import type { MinimalD1Database } from "../db/client";
import { getServerEnv } from "../env";
import type { SendEmailInput, SendEmailResult } from "./types";
import { createEmailLog, markEmailLogFailed, markEmailLogSent } from "../db/queries/email-logs";

const DEFAULT_FROM = "Modernized Visions <team@modernizedvisions.agency>";

export async function sendEmail(
  db: MinimalD1Database | null,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const { resendApiKey } = getServerEnv();
  const emailLogId = db
    ? await createEmailLog(db, {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        toEmail: input.to,
        fromEmail: DEFAULT_FROM,
        subject: input.subject,
        templateKey: input.templateKey ?? null,
        status: "pending",
        provider: "resend",
        payloadJson: JSON.stringify(input.payload ?? {}),
      })
    : null;

  if (!resendApiKey) {
    const error = "RESEND_API_KEY is not configured";
    if (db && emailLogId) {
      await markEmailLogFailed(db, emailLogId, error);
    }

    return { ok: false, error, emailLogId: emailLogId ?? undefined };
  }

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (db && emailLogId) {
      await markEmailLogSent(db, emailLogId, result.data?.id ?? null);
    }

    return {
      ok: true,
      provider: "resend",
      providerMessageId: result.data?.id,
      emailLogId: emailLogId ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    if (db && emailLogId) {
      await markEmailLogFailed(db, emailLogId, message);
    }

    return { ok: false, error: message, emailLogId: emailLogId ?? undefined };
  }
}
