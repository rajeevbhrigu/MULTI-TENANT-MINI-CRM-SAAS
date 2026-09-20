import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { withTenantContext } from "@/server/db/tenant-context";
import { recordAudit } from "@/server/audit";

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "customers.view");
  if (permError) return permError;

  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(req.nextUrl.searchParams.get("pageSize") ?? "25"), 100);

  const [total, customers] = await withTenantContext(ctx.tenantId, async (tx) => {
    const total = await tx.customer.count({ where: { tenantId: ctx.tenantId, deletedAt: null } });
    const customers = await tx.customer.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { customerSince: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return [total, customers] as const;
  });

  return NextResponse.json({ customers, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "customers.create");
  if (permError) return permError;

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 422 });

  const customer = await withTenantContext(ctx.tenantId, (tx) =>
    tx.customer.create({
      data: { tenantId: ctx.tenantId, name: body.name, mobile: body.mobile ?? null, email: body.email ?? null, company: body.company ?? null },
    }),
  );

  await recordAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: "customer.created", entityType: "Customer", entityId: customer.id, newValues: { via: "api" } });

  return NextResponse.json(customer, { status: 201 });
}
