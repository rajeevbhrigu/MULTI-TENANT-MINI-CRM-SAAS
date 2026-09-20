"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/server/actions/auth";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
        <FieldError>{state?.fieldErrors?.confirmPassword}</FieldError>
      </div>
      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
