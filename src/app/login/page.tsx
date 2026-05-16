import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-6 py-16">
      <LoginForm />
      <Link className="underline" href="/">
        Back to Home
      </Link>
    </main>
  );
}
