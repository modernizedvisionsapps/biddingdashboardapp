"use client";

import type { BidStatus } from "@/lib/db/types";
import { BID_STATUS_LABELS, formatCurrency, getBidActivityFieldLabel } from "./bid-formatters";

export interface BidActivityItem {
  id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  message: string | null;
  created_at: string;
  user_display_name?: string | null;
  user_email?: string | null;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatValue(fieldName: string | null, value: string | null) {
  if (!value) {
    return "—";
  }

  if (fieldName === "bid_amount_cents") {
    const cents = Number(value);
    return Number.isFinite(cents) ? formatCurrency(cents) : value;
  }

  if (fieldName === "status") {
    return BID_STATUS_LABELS[value as BidStatus] ?? value;
  }

  return value;
}

function getActorLabel(item: BidActivityItem) {
  return item.user_display_name ?? item.user_email ?? "Unknown user";
}

function getActionLabel(item: BidActivityItem) {
  if (item.action === "bid_created") {
    return "Bid created";
  }

  if (item.action === "status_changed") {
    return "Status changed";
  }

  if (item.action === "field_changed") {
    if (item.field_name === "next_follow_up_date") {
      return "Next follow-up date updated";
    }

    if (item.field_name === "last_followed_up_date") {
      return "Last follow-up date updated";
    }

    if (item.field_name === "notes") {
      return "Notes updated";
    }

    if (item.field_name === "bid_amount_cents") {
      return "Bid amount updated";
    }

    if (item.field_name === "contractor_id" || item.field_name === "contact_id") {
      return "Contact details updated";
    }

    return "Field updated";
  }

  if (item.action === "status_touched") {
    return "Status checked";
  }

  return item.action.replace(/_/g, " ");
}

export function BidActivityTimeline({
  activity,
  loading,
  error,
}: {
  activity: BidActivityItem[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="flex flex-col gap-4 border border-black bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">Activity / History</h3>
        <p className="text-sm text-neutral-700">
          Review who touched this bid, what changed, and when those updates happened.
        </p>
      </div>

      {loading ? <p>Loading activity...</p> : null}
      {!loading && error ? <p className="text-red-700">Could not load activity history.</p> : null}
      {!loading && !error && activity.length === 0 ? <p>No activity has been logged for this bid yet.</p> : null}

      {!loading && !error && activity.length > 0 ? (
        <div className="flex flex-col gap-3">
          {activity.map((item) => {
            const fieldLabel = getBidActivityFieldLabel(item.field_name);
            const oldValue = formatValue(item.field_name, item.old_value);
            const newValue = formatValue(item.field_name, item.new_value);

            return (
              <div className="border border-black p-4" key={item.id}>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">{getActionLabel(item)}</span>
                    <span className="text-xs text-neutral-700">{formatTimestamp(item.created_at)}</span>
                  </div>
                  <p className="text-sm text-neutral-700">{getActorLabel(item)}</p>
                  {item.message ? <p className="text-sm">{item.message}</p> : null}
                  {fieldLabel ? <p className="text-sm text-neutral-700">Field: {fieldLabel}</p> : null}
                  {(item.old_value !== null || item.new_value !== null) ? (
                    <p className="text-sm">
                      {oldValue} {"→"} {newValue}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
