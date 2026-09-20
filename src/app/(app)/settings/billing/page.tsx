import { requireTenantContext } from "@/server/tenant";
import { hasPermission } from "@/server/permissions";
import { prisma } from "@/server/db/client";
import { getUsageSummary } from "@/server/usage";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const ctx = await requireTenantContext();
  const canManage = hasPermission(ctx.membership.role, "billing.manage");

  const [summary, plans] = await Promise.all([
    getUsageSummary(ctx.tenant.id),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!summary) return <p className="text-sm text-muted">No subscription found.</p>;

  return (
    <BillingClient
      currentPlanId={summary.plan.id}
      status={summary.subscription.status}
      periodEnd={summary.subscription.currentPeriodEnd?.toISOString() ?? null}
      usage={[
        { label: "Leads", used: summary.usage.leads.used, limit: summary.usage.leads.limit },
        { label: "Users", used: summary.usage.users.used, limit: summary.usage.users.limit },
        { label: "Messages", used: summary.usage.messages.used, limit: summary.usage.messages.limit },
      ]}
      plans={plans.map((p) => ({ id: p.id, code: p.code, name: p.name, price: Number(p.price), currency: p.currency, maxUsers: p.maxUsers, maxLeads: p.maxLeads }))}
      canManage={canManage}
    />
  );
}
