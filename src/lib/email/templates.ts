import { baseEmailLayout, buildPlainTextFromHtml, escapeHtml, linkButton } from "./render";

export function buildAccountSetupEmail(input: {
  appName: string;
  setupUrl: string;
  recipientEmail: string;
  companyName?: string | null;
}) {
  const subject = `Set up your ${input.appName} account`;
  const bodyHtml = `
    <p style="margin:0 0 16px;">Welcome to ${escapeHtml(input.appName)}. Your company workspace is ready.</p>
    <p style="margin:0 0 16px;">Click below to create your password and finish setting up your account.</p>
    ${linkButton("Set Up Account", input.setupUrl)}
    <p style="margin:0 0 16px;">This setup link is unique to your account. If you did not request this, you can ignore this email.</p>
    <p style="margin:0;">If the button does not work, copy and paste this link into your browser:<br /><a href="${escapeHtml(input.setupUrl)}" style="color:#0f1c2f;word-break:break-all;">${escapeHtml(input.setupUrl)}</a></p>
  `;
  const html = baseEmailLayout({ title: subject, bodyHtml });
  const text = [
    `Welcome to ${input.appName}.`,
    "",
    "Your company workspace is ready. Use the link below to create your password and finish setting up your account:",
    input.setupUrl,
    "",
    "This setup link is unique to your account. If you did not request this, you can ignore this email.",
  ].join("\n");
  return { subject, html, text };
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
