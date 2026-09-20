"use client";

import { useActionState } from "react";
import { contactAction } from "@/server/actions/contact";
import { Input, Textarea, Label, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(contactAction, null);

  if (state && !state.error && !state.fieldErrors) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-soft p-6 text-sm text-success">
        Thanks for reaching out — our team will get back to you within one business day.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required />
        <FieldError>{state?.fieldErrors?.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="company">Company</Label>
        <Input id="company" name="company" />
      </div>
      <div>
        <Label htmlFor="message">How can we help?</Label>
        <Textarea id="message" name="message" rows={5} required />
        <FieldError>{state?.fieldErrors?.message}</FieldError>
      </div>
      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
