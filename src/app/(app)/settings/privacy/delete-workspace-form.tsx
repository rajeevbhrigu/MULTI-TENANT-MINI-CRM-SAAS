"use client";

import { useActionState } from "react";
import { requestWorkspaceDeletionAction } from "@/server/actions/settings";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function DeleteWorkspaceForm({ companyName }: { companyName: string }) {
  const [state, formAction, pending] = useActionState(requestWorkspaceDeletionAction, null);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div>
        <Label htmlFor="confirmation">Type <span className="font-semibold">{companyName}</span> to confirm</Label>
        <Input id="confirmation" name="confirmation" required />
      </div>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Deleting…" : "Delete Workspace"}
      </Button>
    </form>
  );
}
