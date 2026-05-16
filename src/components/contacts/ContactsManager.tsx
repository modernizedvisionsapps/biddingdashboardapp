"use client";

import { useEffect, useMemo, useState } from "react";

import type { BidContractor, BidContractorContact } from "@/lib/db/types";
import { ContactFormModal } from "./ContactFormModal";
import { ContractorFormModal } from "./ContractorFormModal";

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

function previewText(value: string | null, fallback = "—", maxLength = 120) {
  if (!value) {
    return fallback;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function getContactName(contact: BidContractorContact) {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  return fullName || contact.email || contact.phone || "Unnamed Contact";
}

export function ContactsManager() {
  const [contractors, setContractors] = useState<BidContractor[]>([]);
  const [allContacts, setAllContacts] = useState<BidContractorContact[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<BidContractorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [canWrite, setCanWrite] = useState(true);
  const [contractorModalOpen, setContractorModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<BidContractor | null>(null);
  const [editingContact, setEditingContact] = useState<BidContractorContact | null>(null);

  const selectedContractor = contractors.find((contractor) => contractor.id === selectedContractorId) ?? null;

  const filteredContractors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return contractors;
    }

    return contractors.filter((contractor) =>
      [contractor.name, contractor.main_email, contractor.main_phone, contractor.website, contractor.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [contractors, search]);

  const contactCountByContractor = useMemo(() => {
    const next = new Map<string, number>();

    allContacts.forEach((contact) => {
      next.set(contact.contractor_id, (next.get(contact.contractor_id) ?? 0) + 1);
    });

    return next;
  }, [allContacts]);

  async function loadBaseData(preferredContractorId?: string | null) {
    setLoading(true);
    setError(null);

    try {
      const [contractorsResponse, allContactsResponse, authResponse] = await Promise.all([
        fetch("/api/bid-contractors", { cache: "no-store" }),
        fetch("/api/bid-contacts", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);

      const contractorsPayload = (await contractorsResponse.json()) as ContractorsPayload;
      const contactsPayload = (await allContactsResponse.json()) as ContactsPayload;
      const authPayload = (await authResponse.json()) as AuthPayload & { message?: string };

      if (!contractorsResponse.ok || !contractorsPayload.ok) {
        throw new Error(contractorsPayload.message ?? "Failed to load contractors.");
      }

      if (!allContactsResponse.ok || !contactsPayload.ok) {
        throw new Error(contactsPayload.message ?? "Failed to load contacts.");
      }

      const nextContractors = contractorsPayload.contractors ?? [];
      setContractors(nextContractors);
      setAllContacts(contactsPayload.contacts ?? []);
      setCanWrite(Boolean(authPayload.permissions?.canWrite ?? true));

      const nextSelectedId =
        preferredContractorId && nextContractors.some((contractor) => contractor.id === preferredContractorId)
          ? preferredContractorId
          : selectedContractorId && nextContractors.some((contractor) => contractor.id === selectedContractorId)
            ? selectedContractorId
            : nextContractors[0]?.id ?? null;

      setSelectedContractorId(nextSelectedId);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load contractors.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedContacts(contractorId: string) {
    setContactsLoading(true);
    setContactsError(null);

    try {
      const response = await fetch(`/api/bid-contractors/${contractorId}/contacts`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ContactsPayload;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load contractor contacts.");
      }

      setSelectedContacts(payload.contacts ?? []);
    } catch (fetchError) {
      setContactsError(fetchError instanceof Error ? fetchError.message : "Failed to load contractor contacts.");
    } finally {
      setContactsLoading(false);
    }
  }

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (!selectedContractorId) {
      setSelectedContacts([]);
      setContactsError(null);
      return;
    }

    void loadSelectedContacts(selectedContractorId);
  }, [selectedContractorId]);

  function openCreateContractor() {
    setEditingContractor(null);
    setContractorModalOpen(true);
    setMessage(null);
  }

  function openEditContractor(contractor: BidContractor) {
    setEditingContractor(contractor);
    setContractorModalOpen(true);
    setMessage(null);
  }

  function openCreateContact() {
    setEditingContact(null);
    setContactModalOpen(true);
    setMessage(null);
  }

  function openEditContact(contact: BidContractorContact) {
    setEditingContact(contact);
    setContactModalOpen(true);
    setMessage(null);
  }

  async function handleDeleteContractor(contractor: BidContractor) {
    if (!canWrite) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${contractor.name}?\n\nThis will remove saved contacts under this GC and existing bids may lose their linked GC/contact reference.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/bid-contractors/${contractor.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Failed to delete contractor.");
      }

      setMessage("Contractor deleted.");
      if (selectedContractorId === contractor.id) {
        setSelectedContractorId(null);
      }
      await loadBaseData();
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "Failed to delete contractor.");
    }
  }

  async function handleDeleteContact(contact: BidContractorContact) {
    if (!canWrite) {
      return;
    }

    const confirmed = window.confirm(`Delete contact ${getContactName(contact)}?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/bid-contacts/${contact.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Failed to delete contact.");
      }

      setMessage("Contact deleted.");
      await loadBaseData(selectedContractorId);
      if (selectedContractorId) {
        await loadSelectedContacts(selectedContractorId);
      }
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "Failed to delete contact.");
    }
  }

  function handleContractorSaved(savedContractor: BidContractor | null) {
    setContractorModalOpen(false);
    const preferredId = savedContractor?.id ?? editingContractor?.id ?? selectedContractorId;
    setMessage(editingContractor ? "Contractor updated." : "Contractor created.");
    void loadBaseData(preferredId);
  }

  function handleContactSaved(savedContact: BidContractorContact | null) {
    setContactModalOpen(false);
    setMessage(editingContact ? "Contact updated." : "Contact created.");
    const nextSelectedContractorId = savedContact?.contractor_id ?? selectedContractorId;
    void loadBaseData(nextSelectedContractorId).then(() => {
      if (nextSelectedContractorId) {
        void loadSelectedContacts(nextSelectedContractorId);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-[family-name:var(--font-chivo)] text-4xl font-semibold tracking-tight text-[var(--app-primary)]">
            Contacts
          </h1>
          <p className="max-w-3xl text-base text-[var(--app-text-muted)]">
            Manage general contractors and the people tied to each company.
          </p>
        </div>
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canWrite}
          onClick={openCreateContractor}
          type="button"
        >
          Add Contractor
        </button>
      </section>

      {message ? (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-text)] shadow-sm">
          {message}
        </div>
      ) : null}

      {!canWrite ? (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-text-muted)] shadow-sm">
          This account is currently read-only. You can review contractors and contacts, but editing is disabled until billing is updated.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="flex flex-col gap-4">
          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                Search Contractors
              </span>
              <input
                className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:bg-white"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, phone, website, or notes"
                value={search}
              />
            </label>
          </div>

          {loading ? (
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-10 text-sm text-[var(--app-text-muted)] shadow-sm">
              Loading contractors...
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-[var(--app-danger)] bg-[var(--app-danger-soft)] px-5 py-10 text-sm text-[var(--app-danger)] shadow-sm">
              {error}
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-10 shadow-sm">
              <h2 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
                {contractors.length === 0 ? "No contractors yet." : "No contractors match that search."}
              </h2>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                {contractors.length === 0
                  ? "Add your first GC to start building your contact list."
                  : "Try a different search to find a contractor by name, email, phone, website, or notes."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredContractors.map((contractor) => {
                const isSelected = contractor.id === selectedContractorId;

                return (
                  <button
                    className={`rounded-[24px] border p-5 text-left shadow-sm transition ${
                      isSelected
                        ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white"
                        : "border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:border-[var(--app-border-strong)] hover:bg-[#fbfcfe]"
                    }`}
                    key={contractor.id}
                    onClick={() => setSelectedContractorId(contractor.id)}
                    type="button"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-[family-name:var(--font-chivo)] text-xl font-semibold tracking-tight">
                            {contractor.name}
                          </span>
                          <span className={`text-xs ${isSelected ? "text-white/75" : "text-[var(--app-text-muted)]"}`}>
                            {contactCountByContractor.get(contractor.id) ?? 0} contact
                            {(contactCountByContractor.get(contractor.id) ?? 0) === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <div className={`grid gap-1 text-sm ${isSelected ? "text-white/85" : "text-[var(--app-text-muted)]"}`}>
                        <span>{contractor.main_email ?? "No main email"}</span>
                        <span>{contractor.main_phone ?? "No main phone"}</span>
                        <span>{contractor.website ?? "No website"}</span>
                        <span>{previewText(contractor.notes, "No notes")}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          {!selectedContractor ? (
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-10 shadow-sm">
              <h2 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
                Select a contractor to view contacts.
              </h2>
            </div>
          ) : (
            <>
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex flex-col gap-3">
                    <div>
                      <h2 className="font-[family-name:var(--font-chivo)] text-3xl font-semibold tracking-tight text-[var(--app-primary)]">
                        {selectedContractor.name}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm text-[var(--app-text-muted)]">
                        {previewText(selectedContractor.notes, "No contractor notes yet.", 240)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-sm text-[var(--app-text-muted)] md:grid-cols-2">
                      <span>Email: {selectedContractor.main_email ?? "—"}</span>
                      <span>Phone: {selectedContractor.main_phone ?? "—"}</span>
                      <span>Website: {selectedContractor.website ?? "—"}</span>
                      <span>Saved contacts: {contactCountByContractor.get(selectedContractor.id) ?? 0}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-white px-4 text-sm font-medium text-[var(--app-primary)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canWrite}
                      onClick={() => openEditContractor(selectedContractor)}
                      type="button"
                    >
                      Edit Contractor
                    </button>
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-4 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canWrite}
                      onClick={openCreateContact}
                      type="button"
                    >
                      Add Contact
                    </button>
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-danger)] bg-white px-4 text-sm font-medium text-[var(--app-danger)] transition hover:bg-[var(--app-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canWrite}
                      onClick={() => void handleDeleteContractor(selectedContractor)}
                      type="button"
                    >
                      Delete Contractor
                    </button>
                  </div>
                </div>
              </div>

              {contactsLoading ? (
                <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-10 text-sm text-[var(--app-text-muted)] shadow-sm">
                  Loading contacts...
                </div>
              ) : contactsError ? (
                <div className="rounded-[24px] border border-[var(--app-danger)] bg-[var(--app-danger-soft)] px-5 py-10 text-sm text-[var(--app-danger)] shadow-sm">
                  {contactsError}
                </div>
              ) : selectedContacts.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-10 shadow-sm">
                  <h3 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
                    No contacts saved for this contractor yet.
                  </h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {selectedContacts.map((contact) => (
                    <article
                      className="flex flex-col gap-4 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm"
                      key={contact.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-[family-name:var(--font-chivo)] text-xl font-semibold tracking-tight text-[var(--app-primary)]">
                            {getContactName(contact)}
                          </h3>
                          <span className="text-sm text-[var(--app-text-muted)]">{contact.title ?? "No title"}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--app-border)] px-3 text-sm font-medium text-[var(--app-primary)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canWrite}
                            onClick={() => openEditContact(contact)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--app-danger)] px-3 text-sm font-medium text-[var(--app-danger)] transition hover:bg-[var(--app-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canWrite}
                            onClick={() => void handleDeleteContact(contact)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-[var(--app-text-muted)]">
                        {contact.email ? (
                          <a className="hover:text-[var(--app-primary)] hover:underline" href={`mailto:${contact.email}`}>
                            {contact.email}
                          </a>
                        ) : (
                          <span>No email</span>
                        )}

                        {contact.phone ? (
                          <a className="hover:text-[var(--app-primary)] hover:underline" href={`tel:${contact.phone}`}>
                            {contact.phone}
                          </a>
                        ) : (
                          <span>No phone</span>
                        )}

                        <span>{previewText(contact.notes, "No notes")}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <ContractorFormModal
        contractor={editingContractor}
        onClose={() => setContractorModalOpen(false)}
        onSaved={handleContractorSaved}
        open={contractorModalOpen}
        writeDisabled={!canWrite}
      />

      <ContactFormModal
        contact={editingContact}
        contractorId={selectedContractorId}
        onClose={() => setContactModalOpen(false)}
        onSaved={handleContactSaved}
        open={contactModalOpen}
        writeDisabled={!canWrite}
      />
    </div>
  );
}
