"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className="border border-black px-3 py-1 text-sm"
      onClick={handleClick}
      disabled={loading}
      type="button"
    >
      {loading ? "Signing Out..." : "Logout"}
    </button>
  );
}
