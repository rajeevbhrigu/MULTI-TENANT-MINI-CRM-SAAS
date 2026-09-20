import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; reset?: string }>;
}) {
  const params = await searchParams;
  let notice: string | undefined;
  if (params.verify === "success") notice = "Email verified — you can now log in.";
  if (params.reset === "success") notice = "Password updated — log in with your new password.";

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Log in to your MiniCRM workspace.</p>
      <div className="mt-8">
        <LoginForm notice={notice} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Start a free trial
        </Link>
      </p>
    </div>
  );
}
