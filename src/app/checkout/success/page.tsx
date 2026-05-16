import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Checkout Complete</h1>
      <p>Checkout complete. Check your email to set up your account.</p>
      <Link className="underline" href="/login">
        Sign In
      </Link>
    </main>
  );
}
