"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BidDashboard } from "@/components/bids/BidDashboard";
import { ContactsManager } from "@/components/contacts/ContactsManager";

type AppSection = "bids" | "contacts";

function isAppSection(value: string | null): value is AppSection {
  return value === "bids" || value === "contacts";
}

export function AppWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = isAppSection(searchParams.get("section")) ? searchParams.get("section") : "bids";

  function setSection(nextSection: AppSection) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", nextSection);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 border-b border-black pb-3">
        <button
          className={`border px-4 py-2 text-sm font-medium ${
            section === "bids" ? "border-black bg-black text-white" : "border-black bg-white text-black"
          }`}
          onClick={() => setSection("bids")}
          type="button"
        >
          Bids
        </button>
        <button
          className={`border px-4 py-2 text-sm font-medium ${
            section === "contacts" ? "border-black bg-black text-white" : "border-black bg-white text-black"
          }`}
          onClick={() => setSection("contacts")}
          type="button"
        >
          Contacts
        </button>
      </div>

      {section === "contacts" ? <ContactsManager /> : <BidDashboard />}
    </div>
  );
}
