"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";

type AppSection = "bids" | "contacts";

function isAppSection(value: string | null): value is AppSection {
  return value === "bids" || value === "contacts";
}

const NAV_LINK_BASE =
  "inline-flex items-center border-b-2 px-1 py-5 text-sm font-medium transition-colors";

export function AppTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = isAppSection(searchParams.get("section")) ? searchParams.get("section") : "bids";
  const appRootPath = "/app";

  function buildAppHref(nextSection: AppSection) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", nextSection);
    if (nextSection !== "bids") {
      params.delete("status");
    } else if (!params.get("status")) {
      params.set("status", "active");
    }

    return `${appRootPath}?${params.toString()}`;
  }

  function handleNewBid() {
    if (pathname !== appRootPath) {
      router.push("/app?section=bids&status=active");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("section", "bids");
    if (!params.get("status")) {
      params.set("status", "active");
    }
    router.replace(`${appRootPath}?${params.toString()}`);
    window.dispatchEvent(new CustomEvent("bids:new"));
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[rgba(255,255,255,0.95)] backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[1520px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-8">
          <Link className="font-[family-name:var(--font-chivo)] text-xl font-semibold tracking-tight text-[var(--app-primary)]" href="/app?section=bids&status=active">
            BidBoard
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              className={`${NAV_LINK_BASE} ${
                section === "bids"
                  ? "border-[var(--app-accent)] text-[var(--app-primary)]"
                  : "border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-primary)]"
              }`}
              href={buildAppHref("bids")}
            >
              Bids
            </Link>
            <Link
              className={`${NAV_LINK_BASE} ${
                section === "contacts"
                  ? "border-[var(--app-accent)] text-[var(--app-primary)]"
                  : "border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-primary)]"
              }`}
              href={buildAppHref("contacts")}
            >
              Contacts
            </Link>
            <Link
              className={`${NAV_LINK_BASE} border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-primary)]`}
              href="/app/settings"
            >
              Company Settings
            </Link>
            <Link
              className={`${NAV_LINK_BASE} border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-primary)]`}
              href="/app/settings/billing"
            >
              Billing
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="hidden rounded-xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex"
            onClick={handleNewBid}
            type="button"
          >
            New Bid
          </button>
          <Link
            className="hidden rounded-full border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-primary)] sm:inline-flex"
            href="/app/settings"
          >
            Settings
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
