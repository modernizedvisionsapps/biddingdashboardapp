"use client";

import { useState } from "react";

const CHECKOUT_REQUEST_TIMEOUT_MS = 15_000;

async function parseCheckoutResponse(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const rawBody = await response.text();

  if (!rawBody.trim()) {
    return {
      ok: false,
      message: `Checkout request failed with status ${response.status}.`,
    };
  }

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      message: `Checkout request failed with status ${response.status}: ${rawBody}`,
    };
  }

  try {
    return JSON.parse(rawBody) as { ok: boolean; url?: string; message?: string };
  } catch {
    return {
      ok: false,
      message: `Checkout request returned invalid JSON with status ${response.status}.`,
    };
  }
}

export function StartCheckoutButton({
  label = "Start Checkout",
  loadingLabel = "Starting Checkout...",
  className = "w-fit border border-black px-4 py-2",
  errorClassName = "",
}: {
  label?: string;
  loadingLabel?: string;
  className?: string;
  errorClassName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartCheckout() {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort("timeout");
    }, CHECKOUT_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const payload = await parseCheckoutResponse(response);
      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.message ?? "Failed to start checkout.");
      }

      window.location.href = payload.url;
    } catch (checkoutError) {
      window.clearTimeout(timeoutId);

      if (checkoutError instanceof DOMException && checkoutError.name === "AbortError") {
        setError("Checkout request timed out. Please try again.");
      } else {
        setError(checkoutError instanceof Error ? checkoutError.message : "Failed to start checkout.");
      }

      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button className={className} onClick={() => void handleStartCheckout()} type="button">
        {loading ? loadingLabel : label}
      </button>
      {error ? <p className={errorClassName}>{error}</p> : null}
    </div>
  );
}
