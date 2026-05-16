"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthState {
  ok: boolean;
  user?: { id: string; email: string; display_name?: string | null };
  organization?: { id: string; name: string | null; subscription_status?: string; readonly_reason?: string | null };
  permissions?: { canWrite: boolean; isOwner: boolean };
}

export function AuthStatus({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return null;
        }

        const payload = (await response.json()) as AuthState & { message?: string };
        if (!response.ok) {
          throw new Error(payload.message ?? "Failed to load auth context.");
        }

        return payload;
      })
      .then((payload) => {
        if (active && payload) {
          setState(payload);
        }
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load auth context.");
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6">
        <p className="rounded-2xl border border-[var(--app-danger)] bg-[var(--app-danger-soft)] px-5 py-4 text-sm text-[var(--app-danger)]">
          {error}
        </p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6">
        <p className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4 text-sm text-[var(--app-text-muted)] shadow-sm">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {state.permissions && !state.permissions.canWrite ? (
        <div className="border-b border-[var(--app-border)] bg-[var(--app-accent-soft)] px-6 py-3 text-sm text-[var(--app-warning)]">
          Your subscription is not current. You can view existing data, but editing and automations are disabled.
          {state.permissions.isOwner ? (
            <>
              {" "}
              <Link className="font-medium underline" href="/app/settings/billing">
                Manage billing
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
