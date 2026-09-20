"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null);
  const submitted = state !== null && !state.error && !state.fieldErrors;

  if (submitted) {
    return (
      <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
        If an account exists for that email, we&apos;ve sent a password reset link.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>
      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
