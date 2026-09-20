import "server-only";
import { withTenantContext } from "@/server/db/tenant-context";
import { startOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export type DateRangeKey = "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "custom";

export function resolveDateRange(key: DateRangeKey, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  switch (key) {
    case "today":
      return { start: startOfDay(now), end: now };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: startOfDay(now) };
    }
    case "7d":
      return { start: startOfDay(subDays(now, 7)), end: now };
    case "30d":
      return { start: startOfDay(subDays(now, 30)), end: now };
    case "this_month":
      return { start: startOfMonth(now), end: now };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    case "custom":
      return {
        start: from ? new Date(from) : startOfDay(subDays(now, 30)),
        end: to ? new Date(to) : now,
      };
  }
}

export async function getDashboardData(tenantId: string, range: { start: Date; end: Date }) {
  return withTenantContext(tenantId, async (tx) => {
    const [
      totalLeads, newLeads, hotLeads, followupsDue, salesCount, customersCount,
      leadsBySource, leadsByStatus, recentLeads, todaysFollowups, recentActivities,
      revenueAgg,
    ] = await Promise.all([
      tx.lead.count({ where: { tenantId, deletedAt: null } }),
      tx.lead.count({ where: { tenantId, deletedAt: null, createdAt: { gte: range.start, lte: range.end } } }),
      tx.lead.count({ where: { tenantId, priority: "URGENT", deletedAt: null } }),
      tx.followup.count({ where: { tenantId, status: "PENDING", dueDate: { lte: new Date() } } }),
      tx.lead.count({ where: { tenantId, status: "SALE", deletedAt: null } }),
      tx.customer.count({ where: { tenantId, deletedAt: null } }),
      tx.lead.groupBy({ by: ["source"], where: { tenantId, deletedAt: null }, _count: true }),
      tx.lead.groupBy({ by: ["status"], where: { tenantId, deletedAt: null }, _count: true }),
      tx.lead.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      tx.followup.findMany({
        where: { tenantId, status: "PENDING", dueDate: { gte: startOfDay(new Date()) } },
        orderBy: { dueDate: "asc" },
        take: 6,
        include: { lead: true },
      }),
      tx.activity.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { lead: true, user: true },
      }),
      tx.deal.aggregate({ where: { tenantId, status: "WON" }, _sum: { value: true } }),
    ]);

    const leadsOverTimeRaw = await tx.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "Lead"
      WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${range.start} AND "createdAt" <= ${range.end}
      GROUP BY 1 ORDER BY 1 ASC
    `;

    const convertedCount = await tx.lead.count({ where: { tenantId, status: "CUSTOMER", deletedAt: null } });
    const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

    return {
      kpis: {
        totalLeads, newLeads, hotLeads, followupsDue, salesCount, customersCount,
        conversionRate, revenue: Number(revenueAgg._sum.value ?? 0),
      },
      leadsBySource: leadsBySource.map((r) => ({ source: r.source, count: r._count })),
      leadsByStatus: leadsByStatus.map((r) => ({ status: r.status, count: r._count })),
      leadsOverTime: leadsOverTimeRaw.map((r) => ({ day: r.day.toISOString().slice(0, 10), count: Number(r.count) })),
      recentLeads,
      todaysFollowups,
      recentActivities,
    };
  });
}
