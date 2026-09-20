import { requireTenantContext } from "@/server/tenant";
import { hasPermission } from "@/server/permissions";
import { withTenantContext } from "@/server/db/tenant-context";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  const ctx = await requireTenantContext();
  const canManage = hasPermission(ctx.membership.role, "integrations.manage");

  const connections = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.integrationConnection.findMany({ where: { tenantId: ctx.tenant.id } }),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted">
          Every integration connects in safe mock mode first. Real credentials can be added any time without
          changing how the rest of the CRM works.
        </p>
      </div>
      <IntegrationsClient
        connections={connections.map((c) => ({ provider: c.provider, status: c.status, mode: c.mode, externalAccountId: c.externalAccountId }))}
        canManage={canManage}
      />
    </div>
  );
}
