"use client";

import { FormEvent, useEffect, useState } from "react";

import type { BidContractor } from "@/lib/db/types";

interface ContractorFormValues {
  name: string;
  website: string;
  mainPhone: string;
  mainEmail: string;
  notes: string;
}

const EMPTY_FORM: ContractorFormValues = {
  name: "",
  website: "",
  mainPhone: "",
  mainEmail: "",
  notes: "",
};

function contractorToFormValues(contractor: BidContractor): ContractorFormValues {
  return {
    name: contractor.name,
    website: contractor.website ?? "",
    mainPhone: contractor.main_phone ?? "",
    mainEmail: contractor.main_email ?? "",
    notes: contractor.notes ?? "",
  };
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function ContractorFormModal({
  contractor,
  open,
  writeDisabled,
  onClose,
  onSaved,
}: {
  contractor: BidContractor | null;
  open: boolean;
  writeDisabled: boolean;
  onClose: () => void;
  onSaved: (contractor: BidContractor | null) => void;
}) {
  const [values, setValues] = useState<ContractorFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(contractor ? contractorToFormValues(contractor) : EMPTY_FORM);
    setSubmitting(false);
    setMessage(null);
  }, [contractor, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        name: values.name.trim(),
        website: normalizeOptional(values.website),
        mainPhone: normalizeOptional(values.mainPhone),
        mainEmail: normalizeOptional(values.mainEmail),
        notes: normalizeOptional(values.notes),
      };

      const response = await fetch(contractor ? `/api/bid-contractors/${contractor.id}` : "/api/bid-contractors", {
        method: contractor ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok: boolean;
        contractor?: BidContractor | null;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Failed to save contractor.");
      }

      onSaved(result.contractor ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save contractor.");
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
            <h2 className="text-xl font-semibold">{contractor ? "Edit Contractor" : "Add Contractor"}</h2>
            <p className="text-sm text-neutral-700">Save GCs once so future bids can use clean linked company records.</p>
          </div>
          <button className="border border-black px-3 py-2" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="flex flex-col gap-4 px-5 py-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Name</span>
            <input
              className="border border-black px-3 py-2"
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              required
              value={values.name}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="font-medium">Website</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
                value={values.website}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-medium">Main Phone</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, mainPhone: event.target.value }))}
                value={values.mainPhone}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-medium">Main Email</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setValues((current) => ({ ...current, mainEmail: event.target.value }))}
                value={values.mainEmail}
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
              This account is currently read-only. You can review contractors, but saving changes is disabled until billing is updated.
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
              {submitting ? "Saving..." : contractor ? "Save Contractor" : "Create Contractor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
