"use client";

import { useSearchParams } from "next/navigation";

import { BidDashboard } from "@/components/bids/BidDashboard";
import { ContactsManager } from "@/components/contacts/ContactsManager";

type AppSection = "bids" | "contacts";

function isAppSection(value: string | null): value is AppSection {
  return value === "bids" || value === "contacts";
}

export function AppWorkspace() {
  const searchParams = useSearchParams();
  const section = isAppSection(searchParams.get("section")) ? searchParams.get("section") : "bids";

  return (
    <div className="flex flex-col gap-8">
      {section === "contacts" ? <ContactsManager /> : <BidDashboard />}
    </div>
  );
}
