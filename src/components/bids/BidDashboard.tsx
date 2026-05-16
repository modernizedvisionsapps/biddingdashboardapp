"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BidFilters } from "./BidFilters";
import { BidFormModal } from "./BidFormModal";
import { BidTable } from "./BidTable";
import type { BidContractor, BidContractorContact, BidListRow, BidStatus } from "@/lib/db/types";
import {
  BID_STATUS_LABELS,
  type FollowUpFilter,
  getFollowUpStatus,
  matchesFollowUpFilter,
} from "./bid-formatters";

type SortField =
  | "next_follow_up_date"
  | "date_submitted"
  | "bid_amount_cents"
  | "project_name"
  | "contractor_name"
  | "last_followed_up_date"
  | "updated_at";

type SortDirection = "asc" | "desc";

interface BidsPayload {
  ok: boolean;
  bids?: BidListRow[];
  message?: string;
}

interface ContractorsPayload {
  ok: boolean;
  contractors?: BidContractor[];
  message?: string;
}

interface ContactsPayload {
  ok: boolean;
  contacts?: BidContractorContact[];
  message?: string;
}

interface AuthPayload {
  ok: boolean;
  permissions?: { canWrite: boolean };
}

interface StatusTabConfig {
  value: BidStatus;
  label: string;
  heading: string;
  subheading: string;
  emptyTitle: string;
  emptyMessage: string;
}

const STATUS_TABS: StatusTabConfig[] = [
  {
    value: "active",
    label: "Bid Status",
    heading: "Bid Status Dashboard",
    subheading: "Track active bids, follow-ups, contacts, and current notes.",
    emptyTitle: "No active bids yet.",
    emptyMessage: "Add your first bid to start tracking follow-ups.",
  },
  {
    value: "pending_award",
    label: "Pending Award",
    heading: "Pending Award",
    subheading: "Bids that have been submitted and are waiting on award decisions.",
    emptyTitle: "No bids are pending award right now.",
    emptyMessage: "Move submitted bids here while you wait on the award decision.",
  },
  {
    value: "awarded",
    label: "Awarded",
    heading: "Awarded Jobs",
    subheading: "Bids your company has won.",
    emptyTitle: "No awarded jobs yet.",
    emptyMessage: "Winning bids will remain visible here as part of your awarded pipeline.",
  },
  {
    value: "lost",
    label: "Lost / Dead",
    heading: "Lost / Dead Jobs",
    subheading: "Jobs that are no longer active or were not awarded.",
    emptyTitle: "No lost or dead jobs yet.",
    emptyMessage: "Lost, dead, declined, or no-longer-pursued bids will show here.",
  },
  {
    value: "on_hold",
    label: "On Hold",
    heading: "On Hold Jobs",
    subheading: "Jobs paused until there is a future update.",
    emptyTitle: "No jobs are currently on hold.",
    emptyMessage: "Paused bids can stay out of the active queue until work resumes.",
  },
];

function isBidStatus(value: string | null | undefined): value is BidStatus {
  return STATUS_TABS.some((tab) => tab.value === value);
}

function createEmptyStatusCounts(): Record<BidStatus, number> {
  return {
    active: 0,
    pending_award: 0,
    awarded: 0,
    lost: 0,
    on_hold: 0,
  };
}

export function BidDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get("status");
  const selectedStatus = isBidStatus(statusFromUrl) ? statusFromUrl : "active";
  const selectedTab = STATUS_TABS.find((tab) => tab.value === selectedStatus) ?? STATUS_TABS[0];

  const [bids, setBids] = useState<BidListRow[]>([]);
  const [contractors, setContractors] = useState<BidContractor[]>([]);
  const [contacts, setContacts] = useState<BidContractorContact[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<BidStatus, number>>(createEmptyStatusCounts());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("next_follow_up_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<BidListRow | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    if (statusFromUrl === null || isBidStatus(statusFromUrl)) {
      return;
    }

    router.replace(`${pathname}?status=active`);
  }, [pathname, router, statusFromUrl]);

  const bidQueryString = useMemo(() => {
    const params = new URLSearchParams({
      status: selectedStatus,
      sortBy,
      sortDirection,
    });

    if (appliedSearch.trim()) {
      params.set("search", appliedSearch.trim());
    }

    return params.toString();
  }, [appliedSearch, selectedStatus, sortBy, sortDirection]);

  const visibleBids = useMemo(
    () => bids.filter((bid) => matchesFollowUpFilter(bid, followUpFilter)),
    [bids, followUpFilter],
  );

  const currentStatusSummary = useMemo(() => {
    const summary = {
      dueToday: 0,
      overdue: 0,
      thisWeek: 0,
      noFollowUp: 0,
    };

    bids.forEach((bid) => {
      const bucket = getFollowUpStatus(bid.next_follow_up_date).bucket;
      if (bucket === "due_today") {
        summary.dueToday += 1;
      } else if (bucket === "overdue") {
        summary.overdue += 1;
      } else if (bucket === "this_week") {
        summary.thisWeek += 1;
      } else if (bucket === "no_follow_up") {
        summary.noFollowUp += 1;
      }
    });

    return summary;
  }, [bids]);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      const statusCountRequests = STATUS_TABS.map((tab) =>
        fetch(`/api/bids?status=${tab.value}`, { cache: "no-store" }),
      );

      const [bidsResponse, contractorsResponse, contactsResponse, authResponse, ...statusResponses] = await Promise.all([
        fetch(`/api/bids?${bidQueryString}`, { cache: "no-store" }),
        fetch("/api/bid-contractors", { cache: "no-store" }),
        fetch("/api/bid-contacts", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
        ...statusCountRequests,
      ]);

      const bidsPayload = (await bidsResponse.json()) as BidsPayload;
      const contractorsPayload = (await contractorsResponse.json()) as ContractorsPayload;
      const contactsPayload = (await contactsResponse.json()) as ContactsPayload;
      const authPayload = (await authResponse.json()) as AuthPayload & { message?: string };
      const statusPayloads = (await Promise.all(statusResponses.map((response) => response.json()))) as BidsPayload[];

      if (!bidsResponse.ok || !bidsPayload.ok) {
        throw new Error(bidsPayload.message ?? "Failed to load bids.");
      }

      if (!contractorsResponse.ok || !contractorsPayload.ok) {
        throw new Error(contractorsPayload.message ?? "Failed to load contractors.");
      }

      if (!contactsResponse.ok || !contactsPayload.ok) {
        throw new Error(contactsPayload.message ?? "Failed to load contacts.");
      }

      setBids(bidsPayload.bids ?? []);
      setContractors(contractorsPayload.contractors ?? []);
      setContacts(contactsPayload.contacts ?? []);
      setCanWrite(Boolean(authPayload.permissions?.canWrite ?? true));
      setStatusCounts(
        STATUS_TABS.reduce<Record<BidStatus, number>>((accumulator, tab, index) => {
          accumulator[tab.value] =
            statusResponses[index].ok && statusPayloads[index].ok ? statusPayloads[index].bids?.length ?? 0 : 0;
          return accumulator;
        }, createEmptyStatusCounts()),
      );
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, [bidQueryString]);

  function openCreateModal() {
    setEditingBid(null);
    setModalOpen(true);
    setMessage(null);
  }

  function openEditModal(bid: BidListRow) {
    setEditingBid(bid);
    setModalOpen(true);
    setMessage(null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingBid(null);
  }

  function handleSelectStatus(status: BidStatus) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", status);
    router.replace(`${pathname}?${params.toString()}`);
    setError(null);
    setMessage(null);
  }

  async function handleStatusChange(bidId: string, status: BidStatus) {
    setStatusUpdatingId(bidId);
    setMessage(null);

    try {
      const response = await fetch(`/api/bids/${bidId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Failed to update bid status.");
      }

      setMessage("Bid status updated.");
    } catch (updateError) {
      setMessage(updateError instanceof Error ? updateError.message : "Failed to update bid status.");
    } finally {
      setStatusUpdatingId(null);
      await loadDashboardData();
    }
  }

  function handleModalSaved() {
    closeModal();
    setMessage(editingBid ? "Bid updated." : "Bid created in Active.");
    void loadDashboardData();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">{selectedTab.heading}</h1>
            <p className="max-w-3xl text-sm text-neutral-700">{selectedTab.subheading}</p>
          </div>
          <button
            className="border border-black bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-neutral-500"
            disabled={!canWrite}
            onClick={openCreateModal}
            type="button"
          >
            Add Bid
          </button>
        </div>
        {message ? <p className="text-sm text-neutral-700">{message}</p> : null}
        {!canWrite ? (
          <p className="text-sm text-neutral-700">
            This account is currently read-only. You can review bids and activity, but editing is disabled until billing is updated.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-black pb-3">
        {STATUS_TABS.map((tab) => {
          const isSelected = tab.value === selectedStatus;

          return (
            <button
              className={`border px-4 py-2 text-sm font-medium ${
                isSelected ? "border-black bg-black text-white" : "border-black bg-white text-black"
              }`}
              key={tab.value}
              onClick={() => handleSelectStatus(tab.value)}
              type="button"
            >
              {tab.label} <span className="ml-1 text-xs opacity-80">({statusCounts[tab.value]})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {STATUS_TABS.map((tab) => (
          <div className="border border-black bg-white p-4" key={tab.value}>
            <p className="text-xs uppercase tracking-wide text-neutral-600">{BID_STATUS_LABELS[tab.value]}</p>
            <p className="mt-2 text-2xl font-semibold">{statusCounts[tab.value]}</p>
          </div>
        ))}
        <div className="border border-black bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-600">Due Today</p>
          <p className="mt-2 text-2xl font-semibold">{currentStatusSummary.dueToday}</p>
        </div>
        <div className="border border-black bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-600">Overdue</p>
          <p className="mt-2 text-2xl font-semibold">{currentStatusSummary.overdue}</p>
        </div>
      </div>

      <BidFilters
        followUpFilter={followUpFilter}
        loading={loading}
        onApply={() => setAppliedSearch(searchInput)}
        onFollowUpFilterChange={setFollowUpFilter}
        onRefresh={() => void loadDashboardData()}
        onSearchValueChange={setSearchInput}
        onSortByChange={setSortBy}
        onSortDirectionChange={setSortDirection}
        searchValue={searchInput}
        sortBy={sortBy}
        sortDirection={sortDirection}
      />

      {loading ? (
        <div className="border border-black bg-white px-4 py-8">
          <p>Loading {selectedTab.label.toLowerCase()}...</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="border border-black bg-white px-4 py-8">
          <p className="text-red-700">{error}</p>
        </div>
      ) : null}

      {!loading && !error && visibleBids.length === 0 ? (
        <div className="border border-black bg-white px-4 py-8">
          <h2 className="text-lg font-semibold">
            {bids.length === 0 ? selectedTab.emptyTitle : "No bids match the current follow-up filter."}
          </h2>
          <p className="mt-2 text-sm text-neutral-700">
            {bids.length === 0 ? selectedTab.emptyMessage : "Try another urgency filter or refresh the list."}
          </p>
        </div>
      ) : null}

      {!loading && !error && visibleBids.length > 0 ? (
        <BidTable
          bids={visibleBids}
          onEdit={openEditModal}
          onStatusChange={handleStatusChange}
          statusUpdatingId={statusUpdatingId}
          writeDisabled={!canWrite}
        />
      ) : null}

      <BidFormModal
        bid={editingBid}
        contacts={contacts}
        contractors={contractors}
        onClose={closeModal}
        onSaved={handleModalSaved}
        open={modalOpen}
        writeDisabled={!canWrite}
      />
    </div>
  );
}
