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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-2xl border border-black bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{contact ? "Edit Contact" : "Add Contact"}</h2>
            <p className="text-sm text-neutral-700">Save a person under the selected contractor for faster bid entry later.</p>
          </div>
          <button className="border border-black px-3 py-2" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="flex flex-col gap-4 px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="font-medium">First Name</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))}
                value={values.firstName}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-medium">Last Name</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))}
                value={values.lastName}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-medium">Title</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
                value={values.title}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-medium">Phone</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                value={values.phone}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="font-medium">Email</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                value={values.email}
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="font-medium">Notes</span>
            <textarea
              className="min-h-28 border border-black px-3 py-2"
              onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
              value={values.notes}
            />
          </label>

          {message ? <p className="text-sm text-red-700">{message}</p> : null}
          {writeDisabled ? (
            <p className="text-sm text-neutral-700">
              This account is currently read-only. You can review contacts, but saving changes is disabled until billing is updated.
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
              {submitting ? "Saving..." : contact ? "Save Contact" : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
