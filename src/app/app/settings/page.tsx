"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

interface SettingsState {
  ok: boolean;
  organization?: {
    id: string;
    name: string | null;
    subscription_status: string;
    readonly_reason: string | null;
  };
  membership?: { role: string; status: string };
  permissions?: { isOwner: boolean };
  message?: string;
}

export default function SettingsPage() {
  const [state, setState] = useState<SettingsState | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/company", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: SettingsState) => {
        setState(payload);
        setName(payload.organization?.name ?? "");
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = (await response.json()) as SettingsState;
    if (!response.ok || !payload.ok) {
      setMessage(payload.message ?? "Failed to update company.");
      return;
    }
    setState(payload);
    setName(payload.organization?.name ?? "");
    setMessage("Company name updated.");
  }

  if (!state) {
    return <p>Loading...</p>;
  }

  if (!state.ok || !state.organization) {
    return <p>{state.message ?? "Failed to load settings."}</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p>Company name: {state.organization.name ?? "Not set"}</p>
      {state.permissions?.isOwner ? (
        <>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span>Update company name</span>
              <input className="border border-black px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <button className="border border-black px-3 py-2 text-left" type="submit">
              Save
            </button>
          </form>
          <div className="flex gap-4">
            <Link className="underline" href="/app/settings/users">
              Users
            </Link>
            <Link className="underline" href="/app/settings/billing">
              Billing
            </Link>
          </div>
        </>
      ) : (
        <p>Only owners can manage company settings.</p>
      )}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
