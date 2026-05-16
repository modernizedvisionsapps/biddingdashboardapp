"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SetupAccountForm({ token }: { token: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, firstName, lastName, companyName, password, confirmPassword }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; redirectTo?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to set up account.");
      }

      router.push(payload.redirectTo ?? "/app");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to set up account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-[var(--app-shadow)] sm:p-10">
      <div className="mb-8 flex flex-col gap-3 text-center">
        <p className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
          BidBoard
        </p>
        <h1 className="font-[family-name:var(--font-chivo)] text-4xl font-semibold tracking-tight text-[var(--app-primary)]">
          Set Up Your Account
        </h1>
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          Create your password to finish setting up your BidBoard workspace.
        </p>
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          Use the email address that received this setup link.
        </p>
      </div>

      <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">First Name</span>
            <input
              className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Last Name</span>
            <input
              className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Company Name</span>
          <input
            className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Password</span>
          <input
            className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
            placeholder="Create a password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Confirm Password</span>
          <input
            className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-white"
            placeholder="Confirm your password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-[var(--app-danger)] bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        ) : null}

        <button
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-6 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <Link className="text-center text-sm font-medium text-[var(--app-text-muted)] underline" href="/login">
          Sign In
        </Link>
      </form>
    </div>
  );
}
