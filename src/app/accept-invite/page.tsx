import Link from "next/link";

import { AcceptInviteForm } from "./accept-invite-form";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      {token ? (
        <AcceptInviteForm token={token} />
      ) : (
        <div className="flex flex-col gap-3">
          <p>Invite token is missing.</p>
          <Link className="underline" href="/login">
            Sign In
          </Link>
        </div>
      )}
    </main>
  );
}
