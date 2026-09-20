import "server-only";
import { withTenantContext } from "@/server/db/tenant-context";

export type ReportType = "leads" | "source" | "campaign" | "sales" | "team" | "conversion" | "followup" | "customer";

export async function getReportData(tenantId: string, type: ReportType) {
  return withTenantContext(tenantId, async (tx) => {
    switch (type) {
      case "leads": {
        const rows = await tx.lead.findMany({
          where: { tenantId, deletedAt: null },
          select: { leadNumber: true, name: true, status: true, priority: true, source: true, createdAt: true, assignedTo: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 500,
        });
        return rows.map((r) => ({
          "Lead ID": `LEAD-${String(r.leadNumber).padStart(6, "0")}`, Name: r.name, Status: r.status,
          Priority: r.priority, Source: r.source, Assigned: r.assignedTo?.fullName ?? "", Created: r.createdAt.toISOString().slice(0, 10),
        }));
      }
      case "source": {
        const rows = await tx.lead.groupBy({ by: ["source"], where: { tenantId, deletedAt: null }, _count: true });
        return rows.map((r) => ({ Source: r.source, Leads: r._count }));
      }
      case "campaign": {
        const campaigns = await tx.campaign.findMany({ where: { tenantId }, include: { leads: { select: { status: true } } } });
        return campaigns.map((c) => ({
          Campaign: c.name, Platform: c.platform, Leads: c.leads.length,
          Sales: c.leads.filter((l) => l.status === "SALE" || l.status === "CUSTOMER").length,
        }));
      }
      case "sales": {
        const rows = await tx.lead.findMany({
          where: { tenantId, status: { in: ["SALE", "CUSTOMER"] }, deletedAt: null },
          select: { leadNumber: true, name: true, assignedTo: { select: { fullName: true } }, updatedAt: true },
          take: 500,
        });
        return rows.map((r) => ({ "Lead ID": `LEAD-${String(r.leadNumber).padStart(6, "0")}`, Name: r.name, "Closed By": r.assignedTo?.fullName ?? "", Date: r.updatedAt.toISOString().slice(0, 10) }));
      }
      case "team": {
        const members = await tx.tenantUser.findMany({ where: { tenantId, status: "ACTIVE" }, include: { user: true } });
        const rows = await Promise.all(members.map(async (m) => {
          const total = await tx.lead.count({ where: { tenantId, assignedToId: m.userId, deletedAt: null } });
          const won = await tx.lead.count({ where: { tenantId, assignedToId: m.userId, status: { in: ["SALE", "CUSTOMER"] } } });
          return { Member: m.user.fullName, Role: m.role, "Assigned Leads": total, Won: won };
        }));
        return rows;
      }
      case "conversion": {
        const total = await tx.lead.count({ where: { tenantId, deletedAt: null } });
        const converted = await tx.lead.count({ where: { tenantId, status: "CUSTOMER" } });
        return [{ "Total Leads": total, Converted: converted, "Conversion Rate": total > 0 ? `${((converted / total) * 100).toFixed(1)}%` : "0%" }];
      }
      case "followup": {
        const rows = await tx.followup.findMany({
          where: { tenantId }, include: { lead: true, assignedTo: true }, take: 500, orderBy: { dueDate: "desc" },
        });
        return rows.map((f) => ({ Lead: f.lead.name, Title: f.title, "Due Date": f.dueDate.toISOString().slice(0, 10), Status: f.status, Assigned: f.assignedTo.fullName }));
      }
      case "customer": {
        const rows = await tx.customer.findMany({ where: { tenantId, deletedAt: null }, take: 500 });
        return rows.map((c) => ({ Name: c.name, Mobile: c.mobile ?? "", Email: c.email ?? "", Company: c.company ?? "", "Customer Since": c.customerSince.toISOString().slice(0, 10) }));
      }
    }
  });
}
