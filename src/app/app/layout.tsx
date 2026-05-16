import Link from "next/link";

import { AuthStatus } from "@/components/auth/AuthStatus";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthStatus>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-black px-6 py-4">
          <nav className="flex gap-4 text-sm">
            <Link href="/app">App</Link>
            <Link href="/app/settings">Settings</Link>
          </nav>
          <LogoutButton />
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </AuthStatus>
  );
}
