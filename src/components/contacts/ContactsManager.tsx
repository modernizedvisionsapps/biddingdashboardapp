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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete contractor.");
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete contact.");
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
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Contacts</h1>
          <p className="max-w-3xl text-sm text-neutral-700">
            Manage general contractors and the people tied to each company.
          </p>
        </div>
        <button
          className="border border-black bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-neutral-500"
          disabled={!canWrite}
          onClick={openCreateContractor}
          type="button"
        >
          Add Contractor
        </button>
      </div>

      {message ? <p className="text-sm text-neutral-700">{message}</p> : null}
      {!canWrite ? (
        <p className="text-sm text-neutral-700">
          This account is currently read-only. You can review contractors and contacts, but editing is disabled until billing is updated.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <section className="flex flex-col gap-4">
          <div className="border border-black bg-white p-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Search Contractors</span>
              <input
                className="border border-black px-3 py-2"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, phone, website, or notes"
                value={search}
              />
            </label>
          </div>

          {loading ? (
            <div className="border border-black bg-white px-4 py-8">
              <p>Loading contractors...</p>
            </div>
          ) : error ? (
            <div className="border border-black bg-white px-4 py-8">
              <p className="text-red-700">{error}</p>
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="border border-black bg-white px-4 py-8">
              <h2 className="text-lg font-semibold">
                {contractors.length === 0 ? "No contractors yet." : "No contractors match that search."}
              </h2>
              <p className="mt-2 text-sm text-neutral-700">
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
                    className={`flex flex-col gap-2 border p-4 text-left ${
                      isSelected ? "border-black bg-neutral-100 shadow-sm" : "border-black bg-white hover:bg-neutral-50"
                    }`}
                    key={contractor.id}
                    onClick={() => setSelectedContractorId(contractor.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">{contractor.name}</span>
                        <span className="text-xs text-neutral-700">
                          {contactCountByContractor.get(contractor.id) ?? 0} contact
                          {(contactCountByContractor.get(contractor.id) ?? 0) === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-neutral-700">
                      <span>{contractor.main_email ?? "No main email"}</span>
                      <span>{contractor.main_phone ?? "No main phone"}</span>
                      <span>{contractor.website ?? "No website"}</span>
                      <span>{previewText(contractor.notes, "No notes")}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          {!selectedContractor ? (
            <div className="border border-black bg-white px-4 py-8">
              <h2 className="text-lg font-semibold">Select a contractor to view contacts.</h2>
            </div>
          ) : (
            <>
              <div className="border border-black bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-semibold">{selectedContractor.name}</h2>
                    <div className="grid grid-cols-1 gap-2 text-sm text-neutral-700 md:grid-cols-2">
                      <span>Email: {selectedContractor.main_email ?? "—"}</span>
                      <span>Phone: {selectedContractor.main_phone ?? "—"}</span>
                      <span>Website: {selectedContractor.website ?? "—"}</span>
                      <span>Saved contacts: {contactCountByContractor.get(selectedContractor.id) ?? 0}</span>
                    </div>
                    <p className="text-sm text-neutral-700">
                      {previewText(selectedContractor.notes, "No contractor notes yet.", 240)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="border border-black px-3 py-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                      disabled={!canWrite}
                      onClick={() => openEditContractor(selectedContractor)}
                      type="button"
                    >
                      Edit Contractor
                    </button>
                    <button
                      className="border border-black px-3 py-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                      disabled={!canWrite}
                      onClick={openCreateContact}
                      type="button"
                    >
                      Add Contact
                    </button>
                    <button
                      className="border border-black px-3 py-2 text-red-700 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
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
                <div className="border border-black bg-white px-4 py-8">
                  <p>Loading contacts...</p>
                </div>
              ) : contactsError ? (
                <div className="border border-black bg-white px-4 py-8">
                  <p className="text-red-700">{contactsError}</p>
                </div>
              ) : selectedContacts.length === 0 ? (
                <div className="border border-black bg-white px-4 py-8">
                  <h3 className="text-lg font-semibold">No contacts saved for this contractor yet.</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {selectedContacts.map((contact) => (
                    <div className="flex flex-col gap-3 border border-black bg-white p-4" key={contact.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-semibold">{getContactName(contact)}</h3>
                          <span className="text-sm text-neutral-700">{contact.title ?? "No title"}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="border border-black px-3 py-1 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                            disabled={!canWrite}
                            onClick={() => openEditContact(contact)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="border border-black px-3 py-1 text-sm text-red-700 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                            disabled={!canWrite}
                            onClick={() => void handleDeleteContact(contact)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-sm text-neutral-700">
                        {contact.email ? (
                          <a className="underline" href={`mailto:${contact.email}`}>
                            {contact.email}
                          </a>
                        ) : (
                          <span>No email</span>
                        )}

                        {contact.phone ? (
                          <a className="underline" href={`tel:${contact.phone}`}>
                            {contact.phone}
                          </a>
                        ) : (
                          <span>No phone</span>
                        )}

                        <span>{previewText(contact.notes, "No notes")}</span>
                      </div>
                    </div>
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
