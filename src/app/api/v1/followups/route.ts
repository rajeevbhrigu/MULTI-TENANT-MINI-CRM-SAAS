import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { withTenantContext } from "@/server/db/tenant-context";

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "leads.view");
  if (permError) return permError;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const followups = await withTenantContext(ctx.tenantId, (tx) =>
    tx.followup.findMany({
      where: { tenantId: ctx.tenantId, ...(status && { status: status as never }) },
      orderBy: { dueDate: "asc" },
      take: 200,
    }),
  );
  return NextResponse.json({ followups });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "leads.edit");
  if (permError) return permError;

  const body = await req.json().catch(() => null);
  if (!body?.leadId || !body?.title || !body?.dueDate) {
    return NextResponse.json({ error: "leadId, title and dueDate are required" }, { status: 422 });
  }

  const assignedToId = body.assignedToId ?? ctx.userId;
  if (!assignedToId) {
    return NextResponse.json({ error: "assignedToId is required when using an API key (no session user to default to)" }, { status: 422 });
  }

  const followup = await withTenantContext(ctx.tenantId, (tx) =>
    tx.followup.create({
      data: {
        tenantId: ctx.tenantId,
        leadId: body.leadId,
        title: body.title,
        description: body.description ?? null,
        dueDate: new Date(body.dueDate),
        priority: body.priority ?? "MEDIUM",
        assignedToId,
        createdById: assignedToId,
      },
    }),
  );

  return NextResponse.json(followup, { status: 201 });
}
