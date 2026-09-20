"use client";

import { useActionState } from "react";
import { createLeadAction } from "@/server/actions/leads";
import { Input, Select, Textarea, Label, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LeadForm({ members }: { members: { id: string; fullName: string }[] }) {
  const [state, formAction, pending] = useActionState(createLeadAction, null);

  return (
    <Card className="max-w-2xl p-6">
      <form action={formAction} className="space-y-4">
        {state?.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
            <FieldError>{state?.fieldErrors?.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile</Label>
            <Input id="mobile" name="mobile" type="tel" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div>
            <Label htmlFor="source">Source</Label>
            <Select id="source" name="source" defaultValue="MANUAL">
              {["MANUAL", "WHATSAPP", "FACEBOOK", "INSTAGRAM", "GMAIL", "WEBSITE", "REFERRAL", "OTHER"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" name="priority" defaultValue="MEDIUM">
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="assignedToId">Assign To</Label>
            <Select id="assignedToId" name="assignedToId" defaultValue="">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Lead"}
        </Button>
      </form>
    </Card>
  );
}
