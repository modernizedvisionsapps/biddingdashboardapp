"use client";

import type { BidListRow, BidStatus } from "@/lib/db/types";

import { BidStatusBadge } from "./BidStatusBadge";
import {
  BID_STATUS_LABELS,
  formatCurrency,
  formatDateOnly,
  getContactPrimary,
  getContactSecondary,
  getFollowUpStatus,
  getGcLabel,
  getNotePreview,
} from "./bid-formatters";

const STATUS_OPTIONS: Array<{ value: BidStatus; label: string }> = (
  Object.entries(BID_STATUS_LABELS) as Array<[BidStatus, string]>
).map(([value, label]) => ({ value, label }));

export function BidTable({
  bids,
  statusUpdatingId,
  writeDisabled,
  onEdit,
  onStatusChange,
}: {
  bids: BidListRow[];
  statusUpdatingId: string | null;
  writeDisabled: boolean;
  onEdit: (bid: BidListRow) => void;
  onStatusChange: (bidId: string, status: BidStatus) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-surface-muted)]">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Project</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Bid Amount</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">GC</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Contact</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Submitted</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Last Follow-Up</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Next Follow-Up</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Responsible</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Status</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Notes</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {bids.map((bid) => {
              const followUpStatus = getFollowUpStatus(bid.next_follow_up_date);
              const contactSecondary = getContactSecondary(bid);

              return (
                <tr className="align-top transition hover:bg-[#fbfcfe]" key={bid.id}>
                  <td className="px-6 py-5">
                    <div className="flex min-w-[16rem] flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-[family-name:var(--font-chivo)] text-lg font-semibold tracking-tight text-[var(--app-primary)]">
                          {bid.project_name}
                        </span>
                        <span className="text-xs text-[var(--app-text-muted)]">Created {formatDateOnly(bid.created_at.slice(0, 10))}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap font-medium text-[var(--app-primary)]">
                    {formatCurrency(bid.bid_amount_cents)}
                  </td>
                  <td className="px-4 py-5 text-[var(--app-text)]">{getGcLabel(bid)}</td>
                  <td className="px-4 py-5">
                    <div className="max-w-[15rem]">
                      <p className="font-medium text-[var(--app-text)]">{getContactPrimary(bid)}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">{contactSecondary || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap text-[var(--app-text)]">{formatDateOnly(bid.date_submitted)}</td>
                  <td className="px-4 py-5 whitespace-nowrap text-[var(--app-text)]">{formatDateOnly(bid.last_followed_up_date)}</td>
                  <td className="px-4 py-5">
                    <div className="flex min-w-[10rem] flex-col gap-2">
                      <span className="text-[var(--app-text)]">{formatDateOnly(bid.next_follow_up_date)}</span>
                      <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${followUpStatus.toneClassName}`}>
                        {followUpStatus.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-[var(--app-text)]">{bid.responsible_user_display_name ?? "—"}</td>
                  <td className="px-4 py-5">
                    <BidStatusBadge status={bid.status} />
                  </td>
                  <td className="px-4 py-5">
                    <div className="max-w-[17rem] text-sm leading-6 text-[var(--app-text-muted)]">{getNotePreview(bid.notes)}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex min-w-[13rem] flex-col items-end gap-2">
                      <button
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[var(--app-border)] px-3 text-sm font-medium text-[var(--app-primary)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={writeDisabled}
                        onClick={() => onEdit(bid)}
                        type="button"
                      >
                        Edit
                      </button>
                      <select
                        className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={writeDisabled || statusUpdatingId === bid.id}
                        onChange={(event) => void onStatusChange(bid.id, event.target.value as BidStatus)}
                        value={bid.status}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {statusUpdatingId === bid.id && option.value === bid.status ? "Updating..." : option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
