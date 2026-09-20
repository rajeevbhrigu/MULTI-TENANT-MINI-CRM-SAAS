"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/field";
import { setTenantStatusAction, startSupportSessionAction } from "@/server/actions/platform-admin";

export type TenantRow = {
  id: string; companyName: string; ownerName: string; plan: string;
  users: number; leads: number; status: string; createdAt: string; lastActive: string | null;
};

export function PlatformAdminClient({ tenants }: { tenants: TenantRow[] }) {
  const [pending, startTransition] = useTransition();
  const [supportTarget, setSupportTarget] = useState<TenantRow | null>(null);
  const router = useRouter();

  return (
    <div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3">Company</th><th className="px-2 py-3">Owner</th><th className="px-2 py-3">Plan</th>
              <th className="px-2 py-3">Users</th><th className="px-2 py-3">Leads</th><th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Created</th><th className="px-2 py-3">Last Active</th><th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{t.companyName}</td>
                <td className="px-2 py-3 text-xs text-muted">{t.ownerName}</td>
                <td className="px-2 py-3 text-xs">{t.plan}</td>
                <td className="px-2 py-3 text-xs">{t.users}</td>
                <td className="px-2 py-3 text-xs">{t.leads}</td>
                <td className="px-2 py-3"><Badge tone={t.status === "ACTIVE" ? "success" : "danger"}>{t.status}</Badge></td>
                <td className="px-2 py-3 text-xs text-muted">{format(new Date(t.createdAt), "PP")}</td>
                <td className="px-2 py-3 text-xs text-muted">{t.lastActive ? format(new Date(t.lastActive), "PP") : "Never"}</td>
                <td className="px-2 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm" variant="ghost" disabled={pending}
                      onClick={() => startTransition(async () => { await setTenantStatusAction(t.id, t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"); router.refresh(); })}
                    >
                      {t.status === "ACTIVE" ? "Suspend" : "Activate"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setSupportTarget(t)}>Support Access</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {supportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold">Start Support Access — {supportTarget.companyName}</h2>
            <p className="mt-1 text-sm text-muted">
              This opens the workspace with a persistent SUPPORT MODE banner and is fully logged in the audit trail.
            </p>
            <form action={startSupportSessionAction} className="mt-4 space-y-3">
              <input type="hidden" name="tenantId" value={supportTarget.id} />
              <div>
                <Label htmlFor="reason">Reason (required)</Label>
                <Input id="reason" name="reason" required placeholder="e.g. Customer reported a billing issue" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSupportTarget(null)}>Cancel</Button>
                <Button type="submit">Start Support Access</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
