import Link from "next/link";

import { AuthStatus } from "@/components/auth/AuthStatus";
import { AppTopNav } from "@/components/app/AppTopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthStatus>
      <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
        <AppTopNav />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1520px]">{children}</div>
        </main>
        <footer className="border-t border-[var(--app-border)] px-4 py-4 text-xs text-[var(--app-text-muted)] sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between gap-4">
            <span>BidBoard</span>
            <div className="flex items-center gap-4">
              <Link href="/app/settings">Settings</Link>
              <Link href="/app/settings/billing">Billing</Link>
            </div>
          </div>
        </footer>
      </div>
    </AuthStatus>
  );
}
