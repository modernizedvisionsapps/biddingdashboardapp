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
    <div className="overflow-x-auto border border-black bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="sticky top-0 border-b border-black bg-neutral-100 text-left">
            <th className="px-3 py-3 font-semibold">Project</th>
            <th className="px-3 py-3 font-semibold">Bid Amount</th>
            <th className="px-3 py-3 font-semibold">GC</th>
            <th className="px-3 py-3 font-semibold">Contact</th>
            <th className="px-3 py-3 font-semibold">Date Submitted</th>
            <th className="px-3 py-3 font-semibold">Last Follow-Up</th>
            <th className="px-3 py-3 font-semibold">Next Follow-Up</th>
            <th className="px-3 py-3 font-semibold">Responsible</th>
            <th className="px-3 py-3 font-semibold">Notes</th>
            <th className="px-3 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bids.map((bid) => {
            const followUpStatus = getFollowUpStatus(bid.next_follow_up_date);

            return (
              <tr className="border-b border-black align-top transition-colors hover:bg-neutral-50 last:border-b-0" key={bid.id}>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold">{bid.project_name}</span>
                    <BidStatusBadge status={bid.status} />
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{formatCurrency(bid.bid_amount_cents)}</td>
                <td className="px-3 py-3">{getGcLabel(bid)}</td>
                <td className="px-3 py-3">
                  <div className="flex max-w-[13rem] flex-col gap-1">
                    <span>{getContactPrimary(bid)}</span>
                    {getContactSecondary(bid) ? (
                      <span className="text-xs text-neutral-700">{getContactSecondary(bid)}</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(bid.date_submitted)}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(bid.last_followed_up_date)}</td>
                <td className="px-3 py-3">
                  <div className="flex min-w-[10rem] flex-col gap-1">
                    <span className="whitespace-nowrap">{formatDateOnly(bid.next_follow_up_date)}</span>
                    <span className={`inline-flex w-fit rounded-sm border px-2 py-0.5 text-xs ${followUpStatus.toneClassName}`}>
                      {followUpStatus.label}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">{bid.responsible_user_display_name ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="max-w-[16rem] whitespace-normal break-words text-neutral-700">
                    {getNotePreview(bid.notes)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex min-w-[10rem] flex-col gap-2">
                    <button
                      className="border border-black px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                      disabled={writeDisabled}
                      onClick={() => onEdit(bid)}
                      type="button"
                    >
                      Edit
                    </button>
                    <select
                      className="border border-black px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
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
  );
}
