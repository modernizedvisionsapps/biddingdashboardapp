import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6 py-16">
      <div className="w-full max-w-2xl rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-[var(--app-shadow)] sm:p-10">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-success-soft)] text-3xl font-semibold text-[var(--app-success)]">
            ✓
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
              BidBoard
            </p>
            <h1 className="font-[family-name:var(--font-chivo)] text-4xl font-semibold tracking-tight text-[var(--app-primary)]">
              Checkout Complete
            </h1>
            <p className="text-lg leading-8 text-[var(--app-text)]">
              Your payment was successful. Check your email to finish setting up your BidBoard account.
            </p>
            <p className="text-sm leading-7 text-[var(--app-text-muted)]">
              We sent an account setup link to the email you used at checkout. Open that email, click the setup link,
              and create your password to access your dashboard.
            </p>
            <p className="text-sm leading-7 text-[var(--app-text-muted)]">
              If you do not see the email, check spam or promotions. It may take a minute to arrive.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-6 text-sm font-medium text-white transition hover:opacity-95"
              href="/login"
            >
              Sign In
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-white px-6 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)]"
              href="/"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
