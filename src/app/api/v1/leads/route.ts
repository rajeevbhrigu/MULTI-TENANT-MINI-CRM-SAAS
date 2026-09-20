import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { listLeads, type LeadFilters } from "@/server/queries/leads";
import { withTenantContext } from "@/server/db/tenant-context";
import { assertWithinLeadLimit, UsageLimitError } from "@/server/usage";
import { recordAudit } from "@/server/audit";
import type { LeadPriority, LeadSource } from "@prisma/client";

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "leads.view");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const filters: LeadFilters = {
    q: sp.get("q") ?? undefined,
    status: (sp.get("status") as LeadFilters["status"]) ?? undefined,
    priority: (sp.get("priority") as LeadFilters["priority"]) ?? undefined,
    source: (sp.get("source") as LeadFilters["source"]) ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 25,
  };

  const result = await listLeads(ctx.tenantId, filters);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "leads.create");
  if (permError) return permError;

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 422 });

  try {
    await assertWithinLeadLimit(ctx.tenantId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof UsageLimitError ? e.message : "Unable to create lead" }, { status: 429 });
  }

  const lead = await withTenantContext(ctx.tenantId, async (tx) => {
    const counter = await tx.leadCounter.update({ where: { tenantId: ctx.tenantId }, data: { value: { increment: 1 } } });
    const lead = await tx.lead.create({
      data: {
        tenantId: ctx.tenantId,
        leadNumber: counter.value,
        name: body.name,
        mobile: body.mobile ?? null,
        email: body.email ?? null,
        company: body.company ?? null,
        source: (body.source as LeadSource) ?? "OTHER",
        priority: (body.priority as LeadPriority) ?? "MEDIUM",
      },
    });
    await tx.leadStatusHistory.create({ data: { tenantId: ctx.tenantId, leadId: lead.id, newStatus: "NEW", reason: "Created via API" } });
    return lead;
  });

  await recordAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: "lead.created", entityType: "Lead", entityId: lead.id, newValues: { via: "api" } });

  return NextResponse.json(lead, { status: 201 });
}
