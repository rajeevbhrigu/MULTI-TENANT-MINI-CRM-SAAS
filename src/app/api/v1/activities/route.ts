import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { withTenantContext } from "@/server/db/tenant-context";
import type { ActivityChannel, ActivityType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "activities.view");
  if (permError) return permError;

  const leadId = req.nextUrl.searchParams.get("leadId") ?? undefined;
  const activities = await withTenantContext(ctx.tenantId, (tx) =>
    tx.activity.findMany({
      where: { tenantId: ctx.tenantId, ...(leadId && { leadId }) },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  );
  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "activities.create");
  if (permError) return permError;

  const body = await req.json().catch(() => null);
  if (!body?.leadId || !body?.type) return NextResponse.json({ error: "leadId and type are required" }, { status: 422 });

  const activity = await withTenantContext(ctx.tenantId, (tx) =>
    tx.activity.create({
      data: {
        tenantId: ctx.tenantId,
        leadId: body.leadId,
        userId: ctx.userId,
        type: body.type as ActivityType,
        channel: (body.channel as ActivityChannel) ?? "MANUAL",
        subject: body.subject ?? null,
        description: body.description ?? null,
      },
    }),
  );

  return NextResponse.json(activity, { status: 201 });
}
