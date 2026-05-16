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
    <form className="flex w-full max-w-md flex-col gap-4" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold">Set Up Account</h1>
      <input className="border border-black px-3 py-2" placeholder="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
      <input className="border border-black px-3 py-2" placeholder="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
      <input className="border border-black px-3 py-2" placeholder="Company name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
      <input className="border border-black px-3 py-2" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <input className="border border-black px-3 py-2" placeholder="Confirm password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      {error ? <p>{error}</p> : null}
      <button className="border border-black px-3 py-2 text-left" disabled={loading} type="submit">
        {loading ? "Setting Up..." : "Set Up Account"}
      </button>
      <Link className="underline" href="/login">
        Sign In
      </Link>
    </form>
  );
}
