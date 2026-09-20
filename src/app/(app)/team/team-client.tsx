"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { inviteMemberAction, changeRoleAction, setMemberStatusAction } from "@/server/actions/team";
import type { TenantRole } from "@prisma/client";

export type MemberRow = {
  id: string; role: TenantRole; status: string;
  user: { id: string; fullName: string; email: string; lastLoginAt: string | null };
};
export type InviteRow = { id: string; email: string; role: TenantRole; expiresAt: string };

export function TeamClient({ members, invitations, canManage, currentUserId }: {
  members: MemberRow[]; invitations: InviteRow[]; canManage: boolean; currentUserId: string;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(inviteMemberAction, null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      {canManage && (
        <Card>
          <CardHeader><CardTitle>Invite a teammate</CardTitle></CardHeader>
          <CardContent>
            <form action={inviteAction} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <Input name="email" type="email" placeholder="teammate@company.com" required />
              </div>
              <Select name="role" className="w-40" defaultValue="SALES_AGENT">
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="SALES_AGENT">Sales Agent</option>
                <option value="VIEWER">Viewer</option>
              </Select>
              <Button type="submit" disabled={invitePending}>Send Invite</Button>
            </form>
            {inviteState?.error && <p className="mt-2 text-sm text-danger">{inviteState.error}</p>}
            {inviteState?.fieldErrors?.email && <p className="mt-2 text-sm text-danger">{inviteState.fieldErrors.email}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-5 py-3">Name</th><th className="px-2 py-3">Email</th><th className="px-2 py-3">Role</th>
              <th className="px-2 py-3">Status</th><th className="px-2 py-3">Last Login</th><th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{m.user.fullName}{m.user.id === currentUserId && <span className="ml-1 text-xs text-muted">(you)</span>}</td>
                <td className="px-2 py-3 text-xs text-muted">{m.user.email}</td>
                <td className="px-2 py-3">
                  {canManage && m.role !== "OWNER" ? (
                    <Select
                      className="h-8 w-36 text-xs"
                      defaultValue={m.role}
                      disabled={pending}
                      onChange={(e) => startTransition(async () => { await changeRoleAction(m.id, e.target.value as TenantRole); router.refresh(); })}
                    >
                      {["ADMIN", "MANAGER", "SALES_AGENT", "VIEWER"].map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                    </Select>
                  ) : (
                    <Badge tone="brand">{m.role.replace("_", " ")}</Badge>
                  )}
                </td>
                <td className="px-2 py-3"><Badge tone={m.status === "ACTIVE" ? "success" : "neutral"}>{m.status}</Badge></td>
                <td className="px-2 py-3 text-xs text-muted">{m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString() : "Never"}</td>
                <td className="px-2 py-3 text-right">
                  {canManage && m.role !== "OWNER" && (
                    <Button
                      size="sm" variant="ghost" disabled={pending}
                      onClick={() => startTransition(async () => { await setMemberStatusAction(m.id, m.status !== "ACTIVE"); router.refresh(); })}
                    >
                      {m.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending Invitations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm">
                <span>{i.email}</span>
                <Badge tone="warning">{i.role.replace("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
