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
    <div className="border border-black bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Search</span>
          <input
            className="border border-black px-3 py-2"
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder="Project, GC, contact, or notes"
            value={searchValue}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Sort By</span>
          <select
            className="border border-black px-3 py-2"
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

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Direction</span>
          <select
            className="border border-black px-3 py-2"
            onChange={(event) => onSortDirectionChange(event.target.value as SortDirection)}
            value={sortDirection}
          >
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
        </label>

        <button className="border border-black px-4 py-2 self-end" disabled={loading} onClick={onApply} type="button">
          Apply
        </button>

        <button className="border border-black px-4 py-2 self-end" disabled={loading} onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { value: "all", label: "All" },
          { value: "due_today", label: "Due Today" },
          { value: "overdue", label: "Overdue" },
          { value: "this_week", label: "This Week" },
          { value: "no_follow_up", label: "No Follow-Up" },
        ].map((option) => (
          <button
            className={`border px-3 py-1 text-sm ${
              followUpFilter === option.value ? "border-black bg-black text-white" : "border-black bg-white text-black"
            }`}
            key={option.value}
            onClick={() => onFollowUpFilterChange(option.value as FollowUpFilter)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
