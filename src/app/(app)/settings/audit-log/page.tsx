import { requireTenantContext, requirePermission } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default async function AuditLogPage() {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "audit.view");

  const logs = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.auditLog.findMany({
      where: { tenantId: ctx.tenant.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: true },
    }),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted">A secure, read-only record of sensitive actions in your workspace.</p>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3">Time</th><th className="px-2 py-3">Actor</th><th className="px-2 py-3">Action</th>
              <th className="px-2 py-3">Entity</th><th className="px-2 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs text-muted">{format(l.createdAt, "PPp")}</td>
                <td className="px-2 py-3">{l.actor?.fullName ?? "System"}</td>
                <td className="px-2 py-3 font-mono text-xs">{l.action}</td>
                <td className="px-2 py-3 text-xs text-muted">{l.entityType}{l.entityId ? ` #${l.entityId.slice(0, 8)}` : ""}</td>
                <td className="px-2 py-3 text-xs text-muted">{l.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted">No audit events yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
