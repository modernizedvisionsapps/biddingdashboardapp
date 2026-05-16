"use client";

import { FormEvent, useEffect, useState } from "react";

import type { BidContractorContact } from "@/lib/db/types";

interface ContactFormValues {
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: ContactFormValues = {
  firstName: "",
  lastName: "",
  title: "",
  phone: "",
  email: "",
  notes: "",
};

function contactToFormValues(contact: BidContractorContact): ContactFormValues {
  return {
    firstName: contact.first_name ?? "",
    lastName: contact.last_name ?? "",
    title: contact.title ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    notes: contact.notes ?? "",
  };
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function ContactFormModal({
  contact,
  contractorId,
  open,
  writeDisabled,
  onClose,
  onSaved,
}: {
  contact: BidContractorContact | null;
  contractorId: string | null;
  open: boolean;
  writeDisabled: boolean;
  onClose: () => void;
  onSaved: (contact: BidContractorContact | null) => void;
}) {
  const [values, setValues] = useState<ContactFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(contact ? contactToFormValues(contact) : EMPTY_FORM);
    setSubmitting(false);
    setMessage(null);
  }, [contact, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!contact && !contractorId) {
        throw new Error("Select a contractor before adding a contact.");
      }

      const payload = {
        firstName: normalizeOptional(values.firstName),
        lastName: normalizeOptional(values.lastName),
        title: normalizeOptional(values.title),
        phone: normalizeOptional(values.phone),
        email: normalizeOptional(values.email),
        notes: normalizeOptional(values.notes),
      };

      const response = await fetch(
        contact ? `/api/bid-contacts/${contact.id}` : `/api/bid-contractors/${contractorId}/contacts`,
        {
          method: contact ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        ok: boolean;
        contact?: BidContractorContact | null;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Failed to save contact.");
      }

      onSaved(result.contact ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save contact.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(9,20,38,0.45)]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-[var(--app-border)] bg-[var(--app-bg)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--app-border)] bg-[rgba(246,247,243,0.96)] px-6 py-5 backdrop-blur">
          <div className="flex flex-col gap-1">
            <h2 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
              {contact ? "Edit Contact" : "Add Contact"}
            </h2>
            <p className="text-sm text-[var(--app-text-muted)]">
              Save a person under the selected contractor for faster bid entry later.
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

        <form className="flex flex-col gap-5 px-6 py-6" onSubmit={handleSubmit}>
          <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--app-text)]">First Name</span>
                <input
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))}
                  value={values.firstName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--app-text)]">Last Name</span>
                <input
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))}
                  value={values.lastName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--app-text)]">Title</span>
                <input
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
                  value={values.title}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--app-text)]">Phone</span>
                <input
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                  value={values.phone}
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-[var(--app-text)]">Email</span>
                <input
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                  value={values.email}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--app-text)]">Notes</span>
              <textarea
                className="min-h-36 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
                disabled={submitting}
                onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
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
              This account is currently read-only. You can review contacts, but saving changes is disabled until billing is updated.
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
              {submitting ? "Saving..." : contact ? "Save Contact" : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
