import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-6 py-16">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <p>Reset token is missing.</p>
          <Link className="underline" href="/login">
            Sign In
          </Link>
        </>
      )}
    </main>
  );
}
