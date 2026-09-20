import Link from "next/link";
import { requireTenantContext } from "@/server/tenant";
import { getDashboardData, resolveDateRange, type DateRangeKey } from "@/server/queries/dashboard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { DateRangeSelect } from "@/components/app/date-range-select";
import { LeadsOverTimeChart, LeadsBySourceChart, LeadsByStatusChart } from "@/components/app/dashboard-charts";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requireTenantContext();
  const { range: rangeParam } = await searchParams;
  const range = (rangeParam as DateRangeKey) ?? "30d";
  const dateRange = resolveDateRange(range);
  const data = await getDashboardData(ctx.tenant.id, dateRange);

  const kpis = [
    { label: "Total Leads", value: formatNumber(data.kpis.totalLeads) },
    { label: "New Leads", value: formatNumber(data.kpis.newLeads) },
    { label: "Hot Leads", value: formatNumber(data.kpis.hotLeads) },
    { label: "Follow-ups Due", value: formatNumber(data.kpis.followupsDue) },
    { label: "Sales", value: formatNumber(data.kpis.salesCount) },
    { label: "Customers", value: formatNumber(data.kpis.customersCount) },
    { label: "Conversion Rate", value: `${data.kpis.conversionRate.toFixed(1)}%` },
    { label: "Revenue", value: formatCurrency(data.kpis.revenue, ctx.tenant.currency) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Welcome back, {ctx.session.user.fullName.split(" ")[0]}</h1>
          <p className="text-sm text-muted">Here&apos;s what&apos;s happening at {ctx.tenant.companyName}.</p>
        </div>
        <DateRangeSelect current={range} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs font-medium text-muted">{k.label}</p>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadsOverTimeChart data={data.leadsOverTime} />
        </div>
        <LeadsByStatusChart data={data.leadsByStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <LeadsBySourceChart data={data.leadsBySource} />

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent Leads</CardTitle>
            <Link href="/leads" className="text-xs font-medium text-brand hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {data.recentLeads.length === 0 && <p className="p-5 text-sm text-muted">No leads yet.</p>}
            {data.recentLeads.map((l) => (
              <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted-surface">
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-xs text-muted">{l.mobile ?? l.email ?? "—"}</p>
                </div>
                <StatusBadge status={l.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Today&apos;s Follow-ups</CardTitle>
            <Link href="/followups" className="text-xs font-medium text-brand hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {data.todaysFollowups.length === 0 && <p className="p-5 text-sm text-muted">Nothing due today.</p>}
            {data.todaysFollowups.map((f) => (
              <Link key={f.id} href={`/leads/${f.leadId}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted-surface">
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-xs text-muted">{f.lead.name}</p>
                </div>
                <PriorityBadge priority={f.priority} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {data.recentActivities.length === 0 && <p className="p-5 text-sm text-muted">No activity yet.</p>}
            {data.recentActivities.map((a) => (
              <div key={a.id} className="px-5 py-3 text-sm">
                <p className="font-medium">{a.subject ?? a.type.replace("_", " ")}</p>
                <p className="text-xs text-muted">
                  {a.lead?.name ?? "—"} · {a.user?.fullName ?? "System"} · {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
