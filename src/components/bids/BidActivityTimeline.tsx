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
      return "Next follow-up updated";
    }
    if (item.field_name === "last_followed_up_date") {
      return "Last follow-up updated";
    }
    if (item.field_name === "notes") {
      return "Notes updated";
    }
    if (item.field_name === "bid_amount_cents") {
      return "Bid amount updated";
    }
    if (item.field_name === "contractor_id") {
      return "GC updated";
    }
    if (item.field_name === "contact_id") {
      return "Contact updated";
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
    <section className="flex h-full flex-col rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-[var(--app-border)] pb-4">
        <h3 className="font-[family-name:var(--font-chivo)] text-xl font-semibold tracking-tight text-[var(--app-primary)]">
          Activity / History
        </h3>
        <p className="text-sm text-[var(--app-text-muted)]">
          Review who touched this bid, what changed, and when those updates happened.
        </p>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {loading ? <p className="text-sm text-[var(--app-text-muted)]">Loading activity...</p> : null}
        {!loading && error ? <p className="text-sm text-[var(--app-danger)]">Could not load activity history.</p> : null}
        {!loading && !error && activity.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)]">No activity has been logged for this bid yet.</p>
        ) : null}

        {!loading && !error && activity.length > 0 ? (
          <div className="flex flex-col gap-3">
            {activity.map((item) => {
              const fieldLabel = getBidActivityFieldLabel(item.field_name);
              const oldValue = formatValue(item.field_name, item.old_value);
              const newValue = formatValue(item.field_name, item.new_value);

              return (
                <article
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4"
                  key={item.id}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-[var(--app-primary)]">{getActionLabel(item)}</span>
                        <span className="text-xs text-[var(--app-text-muted)]">{getActorLabel(item)}</span>
                      </div>
                      <span className="text-xs text-[var(--app-text-muted)]">{formatTimestamp(item.created_at)}</span>
                    </div>

                    {item.message ? <p className="text-sm text-[var(--app-text)]">{item.message}</p> : null}
                    {fieldLabel ? (
                      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                        {fieldLabel}
                      </p>
                    ) : null}
                    {(item.old_value !== null || item.new_value !== null) ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-text)]">
                        <span>{oldValue}</span>
                        <span className="text-[var(--app-text-muted)]">→</span>
                        <span>{newValue}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
