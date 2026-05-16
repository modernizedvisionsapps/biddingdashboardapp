import Link from "next/link";
import { StartCheckoutButton } from "@/components/billing/start-checkout-button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <div className="flex justify-end">
        <Link className="underline" href="/login">
          Sign In
        </Link>
      </div>
      <h1 className="text-3xl font-semibold">Modernized Visions SaaS Template</h1>
      <p>Public landing page placeholder.</p>
      <StartCheckoutButton />
    </main>
  );
}
