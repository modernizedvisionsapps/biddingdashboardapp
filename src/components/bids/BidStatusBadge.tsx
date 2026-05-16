"use client";

import type { BidStatus } from "@/lib/db/types";
import { BID_STATUS_LABELS } from "./bid-formatters";

const STATUS_CLASSES: Record<BidStatus, string> = {
  active: "border-blue-300 bg-blue-100 text-blue-900",
  pending_award: "border-amber-300 bg-amber-100 text-amber-900",
  awarded: "border-green-300 bg-green-100 text-green-900",
  lost: "border-red-300 bg-red-100 text-red-800",
  on_hold: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return (
    <span
      className={`inline-flex min-w-[7rem] items-center justify-center rounded-sm border px-2 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {BID_STATUS_LABELS[status]}
    </span>
  );
}
