"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createAutomationRuleAction, toggleAutomationRuleAction } from "@/server/actions/automation";

export type RuleRow = { id: string; name: string; triggerEvent: string; isActive: boolean };

const EVENTS = ["LEAD_CREATED", "LEAD_UPDATED", "LEAD_ASSIGNED", "STATUS_CHANGED", "FOLLOWUP_DUE", "MESSAGE_RECEIVED", "CUSTOMER_CONVERTED"];

const EXAMPLE_CONDITIONS = `[{"field":"priority","op":"eq","value":"URGENT"}]`;
const EXAMPLE_ACTIONS = `[{"type":"assign_round_robin"},{"type":"create_followup","hoursFromNow":2,"title":"Call urgent lead"},{"type":"notify_manager","title":"Urgent lead needs attention"}]`;

export function AutomationClient({ rules }: { rules: RuleRow[] }) {
  const [state, formAction, pending] = useActionState(createAutomationRuleAction, null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Rule</CardTitle></CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Urgent lead auto-assign" required />
              </div>
              <div>
                <Label htmlFor="triggerEvent">Trigger Event</Label>
                <Select id="triggerEvent" name="triggerEvent" defaultValue="LEAD_CREATED">
                  {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="conditions">Conditions (JSON)</Label>
              <Textarea id="conditions" name="conditions" defaultValue={EXAMPLE_CONDITIONS} rows={2} className="font-mono text-xs" />
            </div>
            <div>
              <Label htmlFor="actions">Actions (JSON)</Label>
              <Textarea id="actions" name="actions" defaultValue={EXAMPLE_ACTIONS} rows={3} className="font-mono text-xs" />
            </div>
            <Button type="submit" disabled={pending}>Create Rule</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
        <table className="w-full text-sm">
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">{r.name}</td>
                <td className="px-2 py-3 font-mono text-xs text-muted">{r.triggerEvent}</td>
                <td className="px-2 py-3"><Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Active" : "Paused"}</Badge></td>
                <td className="px-2 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => startTransition(async () => { await toggleAutomationRuleAction(r.id, !r.isActive); router.refresh(); })}>
                    {r.isActive ? "Pause" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && <tr><td className="px-5 py-8 text-center text-sm text-muted" colSpan={4}>No automation rules yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
