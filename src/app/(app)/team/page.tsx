import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { hasPermission } from "@/server/permissions";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
  const ctx = await requireTenantContext();
  const canManage = hasPermission(ctx.membership.role, "users.edit");

  const [members, invitations] = await withTenantContext(ctx.tenant.id, async (tx) => {
    const members = await tx.tenantUser.findMany({
      where: { tenantId: ctx.tenant.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    const invitations = await tx.invitation.findMany({
      where: { tenantId: ctx.tenant.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    return [members, invitations] as const;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted">Manage who has access to {ctx.tenant.companyName}.</p>
      </div>
      <TeamClient
        members={members.map((m) => ({
          id: m.id, role: m.role, status: m.status,
          user: { id: m.user.id, fullName: m.user.fullName, email: m.user.email, lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null },
        }))}
        invitations={invitations.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString() }))}
        canManage={canManage}
        currentUserId={ctx.session.user.id}
      />
    </div>
  );
}
