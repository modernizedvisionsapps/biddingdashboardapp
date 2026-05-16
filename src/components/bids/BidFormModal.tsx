"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { BidListRow, BidContractor, BidContractorContact } from "@/lib/db/types";
import { BidActivityTimeline, type BidActivityItem } from "./BidActivityTimeline";

interface BidFormValues {
  projectName: string;
  bidAmountDollars: string;
  contractorId: string;
  manualContractorName: string;
  contactId: string;
  manualContactName: string;
  manualContactPhone: string;
  manualContactEmail: string;
  dateSubmitted: string;
  lastFollowedUpDate: string;
  nextFollowUpDate: string;
  notes: string;
}

const EMPTY_FORM: BidFormValues = {
  projectName: "",
  bidAmountDollars: "",
  contractorId: "",
  manualContractorName: "",
  contactId: "",
  manualContactName: "",
  manualContactPhone: "",
  manualContactEmail: "",
  dateSubmitted: "",
  lastFollowedUpDate: "",
  nextFollowUpDate: "",
  notes: "",
};

function centsToDollars(cents: number | null) {
  if (cents === null) {
    return "";
  }

  return (cents / 100).toFixed(2);
}

function bidToFormValues(bid: BidListRow): BidFormValues {
  return {
    projectName: bid.project_name,
    bidAmountDollars: centsToDollars(bid.bid_amount_cents),
    contractorId: bid.contractor_id ?? "",
    manualContractorName: bid.manual_contractor_name ?? "",
    contactId: bid.contact_id ?? "",
    manualContactName: bid.manual_contact_name ?? "",
    manualContactPhone: bid.manual_contact_phone ?? "",
    manualContactEmail: bid.manual_contact_email ?? "",
    dateSubmitted: bid.date_submitted ?? "",
    lastFollowedUpDate: bid.last_followed_up_date ?? "",
    nextFollowUpDate: bid.next_follow_up_date ?? "",
    notes: bid.notes ?? "",
  };
}

function dollarsToCents(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = Number(trimmed);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error("Bid amount must be a valid non-negative number.");
  }

  return Math.round(normalized * 100);
}

export function BidFormModal({
  bid,
  contractors,
  contacts,
  open,
  writeDisabled,
  onClose,
  onSaved,
}: {
  bid: BidListRow | null;
  contractors: BidContractor[];
  contacts: BidContractorContact[];
  open: boolean;
  writeDisabled: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<BidFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activity, setActivity] = useState<BidActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMessage(null);
    setSubmitting(false);
    setValues(bid ? bidToFormValues(bid) : EMPTY_FORM);
    setActivity([]);
    setActivityError(null);
  }, [bid, open]);

  useEffect(() => {
    if (!open || !bid) {
      return;
    }

    let active = true;
    setActivityLoading(true);
    setActivityError(null);

    void fetch(`/api/bids/${bid.id}/activity`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok: boolean;
          activity?: BidActivityItem[];
          message?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message ?? "Could not load activity history.");
        }

        return payload.activity ?? [];
      })
      .then((items) => {
        if (active) {
          setActivity(items);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load bid activity.", error);
        if (active) {
          setActivityError(error instanceof Error ? error.message : "Could not load activity history.");
        }
      })
      .finally(() => {
        if (active) {
          setActivityLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [bid, open]);

  const availableContacts = useMemo(() => {
    if (!values.contractorId) {
      return contacts;
    }

    return contacts.filter((contact) => contact.contractor_id === values.contractorId);
  }, [contacts, values.contractorId]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        projectName: values.projectName,
        bidAmountCents: dollarsToCents(values.bidAmountDollars),
        contractorId: values.contractorId || null,
        manualContractorName: values.manualContractorName || null,
        contactId: values.contactId || null,
        manualContactName: values.manualContactName || null,
        manualContactPhone: values.manualContactPhone || null,
        manualContactEmail: values.manualContactEmail || null,
        dateSubmitted: values.dateSubmitted || null,
        lastFollowedUpDate: values.lastFollowedUpDate || null,
        nextFollowUpDate: values.nextFollowUpDate || null,
        notes: values.notes || null,
      };

      const response = await fetch(bid ? `/api/bids/${bid.id}` : "/api/bids", {
        method: bid ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Failed to save bid.");
      }

      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save bid.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-6xl border border-black bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{bid ? "Edit Bid" : "Add Bid"}</h2>
            <p className="text-sm text-neutral-700">
              Track an active project bid without sending organization data from the client.
            </p>
          </div>
          <button className="border border-black px-3 py-2" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className={`grid gap-5 px-5 py-5 ${bid ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]" : "grid-cols-1"}`}>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {bid ? (
              <div className="grid grid-cols-1 gap-3 border border-black bg-neutral-50 p-4 text-sm md:grid-cols-2">
                <p>
                  Created by: <span className="font-medium">{bid.created_by_display_name ?? "Unknown user"}</span>
                </p>
                <p>
                  Created at: <span className="font-medium">{bid.created_at}</span>
                </p>
                <p>
                  Last updated by: <span className="font-medium">{bid.updated_by_display_name ?? "Unknown user"}</span>
                </p>
                <p>
                  Last updated at: <span className="font-medium">{bid.updated_at}</span>
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="font-medium">Project Name *</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, projectName: event.target.value }))}
                  required
                  value={values.projectName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Bid Amount (USD)</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  inputMode="decimal"
                  onChange={(event) => setValues((current) => ({ ...current, bidAmountDollars: event.target.value }))}
                  placeholder="25000.00"
                  value={values.bidAmountDollars}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">GC / Contractor</span>
                <select
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      contractorId: event.target.value,
                      contactId:
                        event.target.value && contacts.some(
                          (contact) =>
                            contact.id === current.contactId && contact.contractor_id === event.target.value,
                        )
                          ? current.contactId
                          : "",
                    }))
                  }
                  value={values.contractorId}
                >
                  <option value="">Select contractor</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Manual GC Name</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, manualContractorName: event.target.value }))}
                  value={values.manualContractorName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Contact</span>
                <select
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, contactId: event.target.value }))}
                  value={values.contactId}
                >
                  <option value="">Select contact</option>
                  {availableContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {[contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || contact.email || "Unnamed Contact"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Manual Contact Name</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, manualContactName: event.target.value }))}
                  value={values.manualContactName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Manual Contact Phone</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, manualContactPhone: event.target.value }))}
                  value={values.manualContactPhone}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Manual Contact Email</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, manualContactEmail: event.target.value }))}
                  value={values.manualContactEmail}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Date Submitted</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, dateSubmitted: event.target.value }))}
                  type="date"
                  value={values.dateSubmitted}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Last Follow-Up Date</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, lastFollowedUpDate: event.target.value }))}
                  type="date"
                  value={values.lastFollowedUpDate}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium">Next Follow-Up Date</span>
                <input
                  className="border border-black px-3 py-2"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, nextFollowUpDate: event.target.value }))}
                  type="date"
                  value={values.nextFollowUpDate}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="font-medium">Notes</span>
              <textarea
                className="min-h-28 border border-black px-3 py-2"
                disabled={submitting}
                onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
                value={values.notes}
              />
            </label>

            {message ? <p className="text-sm text-red-700">{message}</p> : null}
            {writeDisabled ? (
              <p className="text-sm text-neutral-700">
                This account is currently read-only. You can review bids, but saving changes is disabled until billing is updated.
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t border-black pt-4">
              <button className="border border-black px-4 py-2" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className="border border-black bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-neutral-500"
                disabled={submitting || writeDisabled}
                type="submit"
              >
                {submitting ? "Saving..." : bid ? "Save Changes" : "Create Bid"}
              </button>
            </div>
          </form>

          {bid ? <BidActivityTimeline activity={activity} error={activityError} loading={activityLoading} /> : null}
        </div>
      </div>
    </div>
  );
}
