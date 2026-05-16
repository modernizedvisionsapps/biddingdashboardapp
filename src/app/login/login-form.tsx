"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; redirectTo?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Invalid email or password.");
      }

      router.push(payload.redirectTo ?? "/app");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-4" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold">Sign In</h1>
      <input className="border border-black px-3 py-2" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input className="border border-black px-3 py-2" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <p>{error}</p> : null}
      <button className="border border-black px-3 py-2 text-left" disabled={loading} type="submit">
        {loading ? "Signing In..." : "Sign In"}
      </button>
      <Link className="underline" href="/forgot-password">
        Forgot Password
      </Link>
      <Link className="underline" href="/">
        Back to Home
      </Link>
    </form>
  );
}
