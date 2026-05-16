"use client";

import type { BidListRow, BidStatus } from "@/lib/db/types";

export type FollowUpFilter = "all" | "due_today" | "overdue" | "this_week" | "no_follow_up";
export type FollowUpBucket = "all" | "due_today" | "overdue" | "this_week" | "no_follow_up";

export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  active: "Bid Status",
  pending_award: "Pending Award",
  awarded: "Awarded",
  lost: "Lost / Dead",
  on_hold: "On Hold",
};

export function formatCurrency(cents: number | null) {
  if (cents === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function parseDateOnly(value: string | null) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDateOnly(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = parseDateOnly(value);
  if (!parsed) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dayDiff(target: Date, base: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

export function getFollowUpStatus(value: string | null): {
  bucket: FollowUpBucket;
  label: string;
  toneClassName: string;
} {
  if (!value) {
    return {
      bucket: "no_follow_up",
      label: "No Follow-Up",
      toneClassName: "border-[var(--app-border)] bg-[var(--app-muted-soft)] text-[var(--app-text-muted)]",
    };
  }

  const parsed = parseDateOnly(value);
  if (!parsed) {
    return {
      bucket: "all",
      label: "Scheduled",
      toneClassName: "border-[var(--app-border)] bg-[var(--app-muted-soft)] text-[var(--app-text-muted)]",
    };
  }

  const today = startOfToday();
  const diff = dayDiff(parsed, today);

  if (diff < 0) {
    return {
      bucket: "overdue",
      label: "Overdue",
      toneClassName: "border-[var(--app-danger)] bg-[var(--app-danger-soft)] text-[var(--app-danger)]",
    };
  }

  if (diff === 0) {
    return {
      bucket: "due_today",
      label: "Due Today",
      toneClassName: "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-warning)]",
    };
  }

  if (diff === 1) {
    return {
      bucket: "this_week",
      label: "Tomorrow",
      toneClassName: "border-[#c7d7f4] bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    };
  }

  if (diff <= 7) {
    return {
      bucket: "this_week",
      label: "This Week",
      toneClassName: "border-[#c7d7f4] bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    };
  }

  return {
    bucket: "all",
    label: "Scheduled",
    toneClassName: "border-[var(--app-border)] bg-[var(--app-muted-soft)] text-[var(--app-text-muted)]",
  };
}

export function matchesFollowUpFilter(bid: BidListRow, filter: FollowUpFilter) {
  if (filter === "all") {
    return true;
  }

  return getFollowUpStatus(bid.next_follow_up_date).bucket === filter;
}

export function getGcLabel(bid: BidListRow) {
  return bid.contractor_name ?? bid.manual_contractor_name ?? "—";
}

export function getContactPrimary(bid: BidListRow) {
  const fullName = [bid.contact_first_name, bid.contact_last_name].filter(Boolean).join(" ").trim();
  return fullName || bid.manual_contact_name || "—";
}

export function getContactSecondary(bid: BidListRow) {
  const email = bid.contact_email ?? bid.manual_contact_email;
  const phone = bid.contact_phone ?? bid.manual_contact_phone;
  return [email, phone].filter(Boolean).join(" • ");
}

export function getNotePreview(notes: string | null, maxLength = 90) {
  if (!notes) {
    return "—";
  }

  return notes.length > maxLength ? `${notes.slice(0, maxLength - 3)}...` : notes;
}

export function getBidActivityFieldLabel(fieldName: string | null) {
  if (!fieldName) {
    return null;
  }

  const labels: Record<string, string> = {
    project_name: "Project Name",
    bid_amount_cents: "Bid Amount",
    contractor_id: "GC",
    contact_id: "Contact",
    manual_contractor_name: "Manual GC Name",
    manual_contact_name: "Manual Contact Name",
    manual_contact_phone: "Manual Contact Phone",
    manual_contact_email: "Manual Contact Email",
    date_submitted: "Date Submitted",
    last_followed_up_date: "Last Follow-Up Date",
    next_follow_up_date: "Next Follow-Up Date",
    status: "Status",
    notes: "Notes",
    responsible_user_id: "Responsible User",
  };

  return labels[fieldName] ?? fieldName;
}
