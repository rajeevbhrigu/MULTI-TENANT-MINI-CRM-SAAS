import { requireTenantContext, requirePermission } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { AutomationClient } from "./automation-client";

export default async function AutomationSettingsPage() {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "automation.manage");

  const rules = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.automationRule.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: { createdAt: "desc" } }),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Automation</h1>
        <p className="text-sm text-muted">Event-driven rules: trigger, conditions and actions — reusable across your workspace.</p>
      </div>
      <AutomationClient rules={rules.map((r) => ({ id: r.id, name: r.name, triggerEvent: r.triggerEvent, isActive: r.isActive }))} />
    </div>
  );
}
