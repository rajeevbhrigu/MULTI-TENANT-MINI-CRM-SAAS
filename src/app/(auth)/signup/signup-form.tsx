"use client";

import { useActionState } from "react";
import { signupAction } from "@/server/actions/auth";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" name="fullName" required />
        <FieldError>{state?.fieldErrors?.fullName}</FieldError>
      </div>
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" name="companyName" required />
        <FieldError>{state?.fieldErrors?.companyName}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">Work Email</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="mobile">Mobile</Label>
        <Input id="mobile" name="mobile" type="tel" required />
        <FieldError>{state?.fieldErrors?.mobile}</FieldError>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
          <FieldError>{state?.fieldErrors?.password}</FieldError>
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required />
          <FieldError>{state?.fieldErrors?.confirmPassword}</FieldError>
        </div>
      </div>
      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? "Creating workspace…" : "Start Free Trial"}
      </Button>
      <p className="text-center text-xs text-muted">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
