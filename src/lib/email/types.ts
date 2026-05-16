export type EmailTemplateKey =
  | "account_setup"
  | "invite_user"
  | "password_reset"
  | "billing_issue";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateKey?: EmailTemplateKey;
  organizationId?: string | null;
  userId?: string | null;
  payload?: Record<string, unknown>;
}

export interface SendEmailResult {
  ok: boolean;
  provider?: string;
  providerMessageId?: string;
  error?: string;
  emailLogId?: string;
}
