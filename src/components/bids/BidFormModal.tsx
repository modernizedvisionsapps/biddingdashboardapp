"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { BidContractor, BidContractorContact, BidListRow } from "@/lib/db/types";
import { formatDateOnly } from "./bid-formatters";
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

function formSectionLabel(title: string, subtitle: string) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-[family-name:var(--font-chivo)] text-lg font-semibold tracking-tight text-[var(--app-primary)]">
        {title}
      </h3>
      <p className="text-sm text-[var(--app-text-muted)]">{subtitle}</p>
    </div>
  );
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
        projectName: values.projectName.trim(),
        bidAmountCents: dollarsToCents(values.bidAmountDollars),
        contractorId: values.contractorId || null,
        manualContractorName: values.manualContractorName.trim() || null,
        contactId: values.contactId || null,
        manualContactName: values.manualContactName.trim() || null,
        manualContactPhone: values.manualContactPhone.trim() || null,
        manualContactEmail: values.manualContactEmail.trim() || null,
        dateSubmitted: values.dateSubmitted || null,
        lastFollowedUpDate: values.lastFollowedUpDate || null,
        nextFollowUpDate: values.nextFollowUpDate || null,
        notes: values.notes.trim() || null,
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
    <div className="fixed inset-0 z-50 bg-[rgba(9,20,38,0.45)]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-[1180px] overflow-y-auto border-l border-[var(--app-border)] bg-[var(--app-bg)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--app-border)] bg-[rgba(246,247,243,0.96)] px-6 py-5 backdrop-blur">
          <div className="flex flex-col gap-1">
            <h2 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
              {bid ? "Edit Bid" : "Add Bid"}
            </h2>
            <p className="text-sm text-[var(--app-text-muted)]">
              Track project details, follow-up dates, saved contacts, and manual fallback info in one place.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-white px-4 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className={`grid gap-6 px-6 py-6 ${bid ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]" : "grid-cols-1"}`}>
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {bid ? (
              <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
                {formSectionLabel("Bid Record", "Quick audit details for the current bid record.")}
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[var(--app-text-muted)] md:grid-cols-2">
                  <p>
                    Created by <span className="font-medium text-[var(--app-text)]">{bid.created_by_display_name ?? "Unknown user"}</span>
                  </p>
                  <p>
                    Created <span className="font-medium text-[var(--app-text)]">{formatDateOnly(bid.created_at.slice(0, 10))}</span>
                  </p>
                  <p>
                    Updated by <span className="font-medium text-[var(--app-text)]">{bid.updated_by_display_name ?? "Unknown user"}</span>
                  </p>
                  <p>
                    Updated <span className="font-medium text-[var(--app-text)]">{formatDateOnly(bid.updated_at.slice(0, 10))}</span>
                  </p>
                </div>
              </section>
            ) : null}

            <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
              {formSectionLabel("Bid Details", "Core project information and saved GC/contact relationships.")}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Project Name *</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, projectName: event.target.value }))}
                    required
                    value={values.projectName}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Bid Amount (USD)</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    inputMode="decimal"
                    onChange={(event) => setValues((current) => ({ ...current, bidAmountDollars: event.target.value }))}
                    placeholder="25000.00"
                    value={values.bidAmountDollars}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">GC / Contractor</span>
                  <select
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        contractorId: event.target.value,
                        contactId:
                          event.target.value && contacts.some(
                            (contact) => contact.id === current.contactId && contact.contractor_id === event.target.value,
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
                  <span className="text-sm font-semibold text-[var(--app-text)]">Manual GC Name</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, manualContractorName: event.target.value }))}
                    placeholder="Optional if you are not using a saved GC yet"
                    value={values.manualContractorName}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Contact</span>
                  <select
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, contactId: event.target.value }))}
                    value={values.contactId}
                  >
                    <option value="">Select contact</option>
                    {availableContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {[contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() ||
                          contact.email ||
                          "Unnamed Contact"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
              {formSectionLabel("Manual Contact Details", "Keep fast-entry fields available when a saved contact is not needed yet.")}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Manual Contact Name</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, manualContactName: event.target.value }))}
                    value={values.manualContactName}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Manual Contact Phone</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, manualContactPhone: event.target.value }))}
                    value={values.manualContactPhone}
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Manual Contact Email</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, manualContactEmail: event.target.value }))}
                    value={values.manualContactEmail}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
              {formSectionLabel("Tracking Dates", "Keep bid submission and follow-up timing visible and current.")}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Date Submitted</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, dateSubmitted: event.target.value }))}
                    type="date"
                    value={values.dateSubmitted}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Last Follow-Up Date</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, lastFollowedUpDate: event.target.value }))}
                    type="date"
                    value={values.lastFollowedUpDate}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--app-text)]">Next Follow-Up Date</span>
                  <input
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                    disabled={submitting}
                    onChange={(event) => setValues((current) => ({ ...current, nextFollowUpDate: event.target.value }))}
                    type="date"
                    value={values.nextFollowUpDate}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
              {formSectionLabel("Notes", "Keep the latest estimating context, follow-up details, and next steps visible.")}
              <label className="mt-5 flex flex-col gap-2">
                <textarea
                  className="min-h-36 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Key notes, follow-up context, revisions, or coordination details"
                  value={values.notes}
                />
              </label>
            </section>

            {message ? (
              <div className="rounded-2xl border border-[var(--app-danger)] bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger)]">
                {message}
              </div>
            ) : null}

            {writeDisabled ? (
              <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-text-muted)]">
                This account is currently read-only. You can review bids, but saving changes is disabled until billing is updated.
              </div>
            ) : null}

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[var(--app-border)] bg-[rgba(246,247,243,0.96)] py-4 backdrop-blur">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-white px-4 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)]"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-5 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
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
