"use client";

import type { BidStatus } from "@/lib/db/types";

import { BID_STATUS_LABELS } from "./bid-formatters";

const STATUS_CLASSES: Record<BidStatus, string> = {
  active: "border-[#c7d7f4] bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  pending_award: "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-warning)]",
  awarded: "border-[#b7dfcb] bg-[var(--app-success-soft)] text-[var(--app-success)]",
  lost: "border-[#e4b9b2] bg-[var(--app-danger-soft)] text-[var(--app-danger)]",
  on_hold: "border-[var(--app-border)] bg-[var(--app-muted-soft)] text-[var(--app-text-muted)]",
};

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_CLASSES[status]}`}
    >
      {BID_STATUS_LABELS[status]}
    </span>
  );
}
