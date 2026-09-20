import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { getLeadDetail } from "@/server/queries/leads";
import { withTenantContext } from "@/server/db/tenant-context";
import { recordAudit } from "@/server/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "leads.view");
  if (permError) return permError;

  const { id } = await params;
  const lead = await getLeadDetail(ctx.tenantId, id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "leads.edit");
  if (permError) return permError;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const allowed = ["name", "mobile", "email", "company", "priority", "assignedToId"] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];

  const result = await withTenantContext(ctx.tenantId, (tx) =>
    tx.lead.updateMany({ where: { id, tenantId: ctx.tenantId }, data }),
  );
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: "lead.updated", entityType: "Lead", entityId: id, newValues: { ...data, via: "api" } });

  const lead = await getLeadDetail(ctx.tenantId, id);
  return NextResponse.json(lead);
}
