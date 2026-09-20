import type { Metadata } from "next";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  if (!params.token) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">This password reset link is missing a token.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="mt-2 text-sm text-muted">Choose a strong password for your account.</p>
      <div className="mt-8">
        <ResetForm token={params.token} />
      </div>
    </div>
  );
}
