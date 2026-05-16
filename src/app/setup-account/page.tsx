import Link from "next/link";
import { SetupAccountForm } from "./setup-account-form";

export default async function SetupAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6 py-16">
      {token ? (
        <SetupAccountForm token={token} />
      ) : (
        <div className="w-full max-w-xl rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-[var(--app-shadow)] sm:p-10">
          <div className="flex flex-col gap-4">
            <p className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
              BidBoard
            </p>
            <h1 className="font-[family-name:var(--font-chivo)] text-3xl font-semibold tracking-tight text-[var(--app-primary)]">
              Setup link missing
            </h1>
            <p className="text-sm leading-7 text-[var(--app-text-muted)]">
              This setup link is missing or incomplete. Open the original email again and use the full setup link.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-5 text-sm font-medium text-white transition hover:opacity-95"
              href="/login"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
