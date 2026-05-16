"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok && response.status >= 500) {
        throw new Error(payload.message ?? "Failed to request password reset.");
      }
      setMessage(payload.message ?? "If an account exists, a reset link has been sent.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-4" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold">Forgot Password</h1>
      <input className="border border-black px-3 py-2" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      {message ? <p>{message}</p> : null}
      {error ? <p>{error}</p> : null}
      <button className="border border-black px-3 py-2 text-left" disabled={loading} type="submit">
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
      <Link className="underline" href="/login">
        Back to Sign In
      </Link>
      <Link className="underline" href="/">
        Back to Home
      </Link>
    </form>
  );
}
