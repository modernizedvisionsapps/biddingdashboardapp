"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; redirectTo?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to reset password.");
      }
      setMessage(payload.message ?? "Password reset successfully.");
      setTimeout(() => {
        router.push(payload.redirectTo ?? "/login");
      }, 800);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-4" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold">Reset Password</h1>
      <input className="border border-black px-3 py-2" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <input className="border border-black px-3 py-2" placeholder="Confirm password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      {message ? <p>{message}</p> : null}
      {error ? <p>{error}</p> : null}
      <button className="border border-black px-3 py-2 text-left" disabled={loading} type="submit">
        {loading ? "Resetting..." : "Reset Password"}
      </button>
      <Link className="underline" href="/login">
        Sign In
      </Link>
    </form>
  );
}
