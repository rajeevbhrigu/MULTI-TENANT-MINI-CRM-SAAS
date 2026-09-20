import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Start Free Trial" };

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Start your free trial</h1>
      <p className="mt-2 text-sm text-muted">14 days free. No credit card required.</p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
