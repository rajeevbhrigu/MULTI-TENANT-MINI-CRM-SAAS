import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { withPlatformAdminContext } from "@/server/db/tenant-context";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PlatformAdminClient, type TenantRow } from "./platform-admin-client";

export default async function PlatformAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isPlatformAdmin) redirect("/dashboard");

  const data = await withPlatformAdminContext(async (tx) => {
    const [totalTenants, activeTenants, trialSubs, activeSubs, totalLeads, tenants] = await Promise.all([
      tx.tenant.count(),
      tx.tenant.count({ where: { status: "ACTIVE" } }),
      tx.subscription.count({ where: { status: "TRIAL" } }),
      tx.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: true } }),
      tx.lead.count(),
      tx.tenant.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          memberships: { where: { role: "OWNER" }, include: { user: true }, take: 1 },
          subscription: { include: { plan: true } },
          _count: { select: { leads: true, memberships: true } },
        },
        take: 100,
      }),
    ]);

    const mrr = activeSubs.reduce((sum, s) => sum + Number(s.plan.price), 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newSignups = await tx.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const churned = await tx.subscription.count({ where: { status: "CANCELLED", cancelledAt: { gte: thirtyDaysAgo } } });

    return { totalTenants, activeTenants, trialSubs, mrr, totalLeads, newSignups, churned, tenants };
  });

  const rows: TenantRow[] = data.tenants.map((t) => ({
    id: t.id,
    companyName: t.companyName,
    ownerName: t.memberships[0]?.user.fullName ?? "—",
    plan: t.subscription?.plan.name ?? "—",
    users: t._count.memberships,
    leads: t._count.leads,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    lastActive: null,
  }));

  const kpis = [
    { label: "Total Tenants", value: formatNumber(data.totalTenants) },
    { label: "Active Tenants", value: formatNumber(data.activeTenants) },
    { label: "Trials", value: formatNumber(data.trialSubs) },
    { label: "MRR", value: formatCurrency(data.mrr) },
    { label: "New Signups (30d)", value: formatNumber(data.newSignups) },
    { label: "Churn (30d)", value: formatNumber(data.churned) },
    { label: "Total Leads", value: formatNumber(data.totalLeads) },
    { label: "System Errors", value: "0" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Platform Admin</h1>
          <p className="text-sm text-muted">Cross-tenant view — separate from any tenant&apos;s own admin permissions.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4">
              <p className="text-xs font-medium text-muted">{k.label}</p>
              <p className="mt-1 text-2xl font-bold">{k.value}</p>
            </Card>
          ))}
        </div>

        <PlatformAdminClient tenants={rows} />
      </div>
    </div>
  );
}
