import type { OrganizationSubscriptionStatus } from "../db/types";

export function isSubscriptionWritable(status: OrganizationSubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export function getAuthPermissions(status: OrganizationSubscriptionStatus) {
  const writable = isSubscriptionWritable(status);
  return {
    canRead: true,
    canWrite: writable,
    canUseAutomations: writable,
  };
}

export function getSubscriptionAccessLabel(status: OrganizationSubscriptionStatus): "Full access" | "Read-only mode" {
  return isSubscriptionWritable(status) ? "Full access" : "Read-only mode";
}

export function getSubscriptionStatusMessage(status: OrganizationSubscriptionStatus): string {
  if (isSubscriptionWritable(status)) {
    return "Your subscription is current. Full access is enabled.";
  }

  switch (status) {
    case "pending":
      return "Your subscription setup is still pending. You can view existing data, but editing and automations are disabled.";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "canceled":
      return "Your subscription is not current. You can view existing data, but editing and automations are disabled until billing is updated.";
    default:
      return "Your subscription is not current. You can view existing data, but editing and automations are disabled.";
  }
}
