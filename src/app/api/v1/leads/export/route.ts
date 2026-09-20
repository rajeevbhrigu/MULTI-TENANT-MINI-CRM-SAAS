import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { listLeads, type LeadFilters } from "@/server/queries/leads";
import { toCsv } from "@/lib/csv";
import { recordAudit } from "@/server/audit";

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;

  const permError = requireApiPermission(ctx, "leads.export");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const filters: LeadFilters = {
    q: sp.get("q") ?? undefined,
    status: (sp.get("status") as LeadFilters["status"]) ?? undefined,
    priority: (sp.get("priority") as LeadFilters["priority"]) ?? undefined,
    source: (sp.get("source") as LeadFilters["source"]) ?? undefined,
    assignedToId: sp.get("assignedToId") ?? undefined,
    sort: (sp.get("sort") as LeadFilters["sort"]) ?? undefined,
    page: 1,
    pageSize: 5000,
  };

  const { leads, total } = await listLeads(ctx.tenantId, filters);

  const csv = toCsv(
    leads.map((l) => ({
      lead_id: `LEAD-${String(l.leadNumber).padStart(6, "0")}`,
      name: l.name,
      mobile: l.mobile,
      email: l.email,
      company: l.company,
      source: l.source,
      status: l.status,
      priority: l.priority,
      assigned_to: l.assignedTo?.fullName ?? "",
      campaign: l.campaign?.name ?? "",
      created_at: l.createdAt.toISOString(),
    })),
    ["lead_id", "name", "mobile", "email", "company", "source", "status", "priority", "assigned_to", "campaign", "created_at"],
  );

  await recordAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: "leads.exported",
    entityType: "Lead",
    newValues: { count: total, filters },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
