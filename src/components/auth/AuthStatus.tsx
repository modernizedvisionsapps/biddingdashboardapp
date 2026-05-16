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
        <div className="border-b border-[var(--app-border)] bg-[var(--app-bg)] px-6 py-5">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-2 rounded-[24px] border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-6 py-5 text-center shadow-sm">
            <p className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-warning)]">
              Your subscription is not current.
            </p>
            <p className="max-w-2xl text-sm leading-7 text-[var(--app-warning)]">
              Your company can still view existing data, but creating or editing records is disabled until billing is updated.
            </p>
            {state.permissions.isOwner ? (
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--app-warning)] bg-white px-4 text-sm font-medium text-[var(--app-warning)] transition hover:bg-[var(--app-warning-soft)]"
                href="/app/settings/billing"
              >
                Manage billing
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
