import "server-only";

import type { MinimalD1Database } from "../db/client";
import { getPublicEnv, getServerEnv } from "../env";
import { sendEmail } from "./send";
import {
  buildAccountSetupEmail,
  buildBillingIssueEmail,
  buildInviteUserEmail,
  buildPasswordResetEmail,
} from "./templates";

export async function sendAccountSetupEmail(
  db: MinimalD1Database | null,
  input: {
    to: string;
    setupToken: string;
    organizationId: string;
    userId?: string | null;
    companyName?: string | null;
  },
) {
  const { appName } = getPublicEnv();
  const { appBaseUrl } = getServerEnv();
  const setupUrl = `${appBaseUrl}/setup-account?token=${encodeURIComponent(input.setupToken)}`;
  const template = buildAccountSetupEmail({
    appName,
    setupUrl,
    recipientEmail: input.to,
    companyName: input.companyName ?? null,
  });

  return sendEmail(db, {
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    templateKey: "account_setup",
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    payload: { setupUrl },
  });
}

export async function sendInviteUserEmail(
  db: MinimalD1Database | null,
  input: {
    to: string;
    inviteToken: string;
    organizationId: string;
    userId?: string | null;
    organizationName: string;
    inviterName?: string | null;
  },
) {
  const { appName } = getPublicEnv();
  const { appBaseUrl } = getServerEnv();
  const inviteUrl = `${appBaseUrl}/accept-invite?token=${encodeURIComponent(input.inviteToken)}`;
  const template = buildInviteUserEmail({
    appName,
    inviteUrl,
    recipientEmail: input.to,
    organizationName: input.organizationName,
    inviterName: input.inviterName ?? null,
  });

  return sendEmail(db, {
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    templateKey: "invite_user",
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    payload: { inviteUrl, organizationName: input.organizationName },
  });
}

export async function sendPasswordResetEmail(
  db: MinimalD1Database | null,
  input: {
    to: string;
    resetToken: string;
    userId?: string | null;
    organizationId?: string | null;
  },
) {
  const { appName } = getPublicEnv();
  const { appBaseUrl } = getServerEnv();
  const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(input.resetToken)}`;
  const template = buildPasswordResetEmail({
    appName,
    resetUrl,
    recipientEmail: input.to,
  });

  return sendEmail(db, {
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    templateKey: "password_reset",
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    payload: { resetUrl },
  });
}

export async function sendBillingIssueEmail(
  db: MinimalD1Database | null,
  input: {
    to: string;
    organizationId?: string | null;
    userId?: string | null;
    organizationName?: string | null;
  },
) {
  const { appName } = getPublicEnv();
  const { appBaseUrl } = getServerEnv();
  const billingUrl = `${appBaseUrl}/app/settings/billing`;
  const template = buildBillingIssueEmail({
    appName,
    billingUrl,
    recipientEmail: input.to,
    organizationName: input.organizationName ?? null,
  });

  return sendEmail(db, {
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    templateKey: "billing_issue",
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    payload: { billingUrl },
  });
}
