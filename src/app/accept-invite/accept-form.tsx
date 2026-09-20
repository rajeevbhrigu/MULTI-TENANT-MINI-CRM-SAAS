"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/server/actions/accept-invite";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function AcceptForm({ token, email, needsPassword }: { token: string; email: string; needsPassword: boolean }) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>
      {needsPassword && (
        <>
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="password">Set a password</Label>
            <Input id="password" name="password" type="password" required />
            <FieldError>{state?.fieldErrors?.password}</FieldError>
          </div>
        </>
      )}
      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </form>
  );
}
