import { baseEmailLayout, buildPlainTextFromHtml, escapeHtml, linkButton } from "./render";

export function buildAccountSetupEmail(input: {
  appName: string;
  setupUrl: string;
  recipientEmail: string;
  companyName?: string | null;
}) {
  const subject = `Set up your ${input.appName} account`;
  const bodyHtml = `
    <p>Your app account is ready.</p>
    <p>Click below to set up your account. This link will expire.</p>
    ${linkButton("Set Up Account", input.setupUrl)}
    <p>If you did not expect this, you can ignore this email.</p>
  `;
  const html = baseEmailLayout({ title: subject, bodyHtml });
  return { subject, html, text: buildPlainTextFromHtml(html) };
}

export function buildInviteUserEmail(input: {
  appName: string;
  inviteUrl: string;
  recipientEmail: string;
  organizationName: string;
  inviterName?: string | null;
}) {
  const inviter = input.inviterName?.trim() || "Someone";
  const subject = `${inviter} invited you to join ${input.organizationName}`;
  const bodyHtml = `
    <p>You were invited to join ${escapeHtml(input.organizationName)} in ${escapeHtml(input.appName)}.</p>
    <p>Click below to accept the invite and create your login.</p>
    ${linkButton("Accept Invite", input.inviteUrl)}
    <p>If you were not expecting this, you can ignore this email.</p>
  `;
  const html = baseEmailLayout({ title: subject, bodyHtml });
  return { subject, html, text: buildPlainTextFromHtml(html) };
}

export function buildPasswordResetEmail(input: {
  appName: string;
  resetUrl: string;
  recipientEmail: string;
}) {
  const subject = `Reset your ${input.appName} password`;
  const bodyHtml = `
    <p>A password reset was requested.</p>
    <p>Click below to reset your password.</p>
    ${linkButton("Reset Password", input.resetUrl)}
    <p>If you did not request it, you can ignore this email.</p>
  `;
  const html = baseEmailLayout({ title: subject, bodyHtml });
  return { subject, html, text: buildPlainTextFromHtml(html) };
}

export function buildBillingIssueEmail(input: {
  appName: string;
  billingUrl: string;
  recipientEmail: string;
  organizationName?: string | null;
}) {
  const subject = `Billing issue for ${input.appName}`;
  const bodyHtml = `
    <p>There is an issue with the subscription or payment for ${escapeHtml(input.organizationName ?? input.appName)}.</p>
    <p>The app may be in read-only mode until billing is updated.</p>
    ${linkButton("Update Billing", input.billingUrl)}
    <p>If you were not expecting this, you can ignore this email.</p>
  `;
  const html = baseEmailLayout({ title: subject, bodyHtml });
  return { subject, html, text: buildPlainTextFromHtml(html) };
}
