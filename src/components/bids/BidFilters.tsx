"use client";

import type { FollowUpFilter } from "./bid-formatters";

type SortField =
  | "next_follow_up_date"
  | "date_submitted"
  | "bid_amount_cents"
  | "project_name"
  | "contractor_name"
  | "last_followed_up_date"
  | "updated_at";

type SortDirection = "asc" | "desc";

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "next_follow_up_date", label: "Next Follow-Up" },
  { value: "date_submitted", label: "Date Submitted" },
  { value: "bid_amount_cents", label: "Bid Amount" },
  { value: "project_name", label: "Project Name" },
  { value: "contractor_name", label: "GC" },
  { value: "last_followed_up_date", label: "Last Follow-Up" },
  { value: "updated_at", label: "Updated At" },
];

const FOLLOW_UP_OPTIONS: Array<{ value: FollowUpFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "due_today", label: "Due Today" },
  { value: "overdue", label: "Overdue" },
  { value: "this_week", label: "This Week" },
  { value: "no_follow_up", label: "No Follow-Up" },
];

export function BidFilters({
  searchValue,
  sortBy,
  sortDirection,
  followUpFilter,
  loading,
  onSearchValueChange,
  onSortByChange,
  onSortDirectionChange,
  onFollowUpFilterChange,
  onApply,
  onRefresh,
}: {
  searchValue: string;
  sortBy: SortField;
  sortDirection: SortDirection;
  followUpFilter: FollowUpFilter;
  loading: boolean;
  onSearchValueChange: (value: string) => void;
  onSortByChange: (value: SortField) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  onFollowUpFilterChange: (value: FollowUpFilter) => void;
  onApply: () => void;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row">
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                Search
              </span>
              <input
                className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                onChange={(event) => onSearchValueChange(event.target.value)}
                placeholder="Project, GC, contact, or notes"
                value={searchValue}
              />
            </label>

            <label className="flex min-w-[13rem] flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                Sort By
              </span>
              <select
                className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                onChange={(event) => onSortByChange(event.target.value as SortField)}
                value={sortBy}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[10rem] flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                Direction
              </span>
              <select
                className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                onChange={(event) => onSortDirectionChange(event.target.value as SortDirection)}
                value={sortDirection}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={onRefresh}
              type="button"
            >
              Refresh
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-4 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={onApply}
              type="button"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
            Follow-Up
          </span>
          <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-[var(--app-surface-muted)] p-1">
            {FOLLOW_UP_OPTIONS.map((option) => (
              <button
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  followUpFilter === option.value
                    ? "bg-white text-[var(--app-primary)] shadow-sm"
                    : "text-[var(--app-text-muted)] hover:text-[var(--app-primary)]"
                }`}
                key={option.value}
                onClick={() => onFollowUpFilterChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
