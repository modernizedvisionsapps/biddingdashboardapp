"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface BillingState {
  ok: boolean;
  organization?: {
    id: string;
    name: string | null;
    subscription_status: string;
    readonly_reason: string | null;
    stripe_customer_id: string | null;
  };
  permissions?: {
    canRead: boolean;
    canWrite: boolean;
    canUseAutomations: boolean;
    isOwner: boolean;
  };
  accessLabel?: string;
  statusMessage?: string;
  message?: string;
}

export default function BillingPage() {
  const [state, setState] = useState<BillingState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/billing/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: BillingState) => {
        if (active) {
          setState(payload);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleManageBilling() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/create-portal-session", {
        method: "POST",
      });
      const payload = (await response.json()) as { ok: boolean; url?: string; message?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.message ?? "Failed to open billing portal.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to open billing portal.");
      setLoading(false);
    }
  }

  if (!state) {
    return <p>Loading...</p>;
  }

  if (!state.ok || !state.organization || !state.permissions) {
    return (
      <div className="flex flex-col gap-3">
        <p>{state.message ?? "Failed to load billing settings."}</p>
        <Link className="underline" href="/app/settings">
          Back to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p>Company name: {state.organization.name ?? "Not set"}</p>
      <p>Subscription status: {state.organization.subscription_status}</p>
      <p>Current access mode: {state.accessLabel ?? (state.permissions.canWrite ? "Full access" : "Read-only mode")}</p>
      <p>
        {state.statusMessage ??
          (state.permissions.canWrite
            ? "Your subscription is current. Full access is enabled."
            : "Your subscription is not current. You can view existing data, but editing and automations are disabled until billing is updated.")}
      </p>
      {!state.permissions.canWrite ? (
        <p>
          Your subscription is not current. You can view existing data, but editing and automations are disabled until billing is updated.
        </p>
      ) : null}
      {state.permissions.isOwner ? (
        <button className="w-fit border border-black px-3 py-2 text-left" disabled={loading} onClick={() => void handleManageBilling()} type="button">
          {loading ? "Opening Billing..." : "Manage Billing"}
        </button>
      ) : (
        <p>Only owners can manage billing.</p>
      )}
      {message ? <p>{message}</p> : null}
      <Link className="underline" href="/app/settings">
        Back to Settings
      </Link>
    </div>
  );
}
