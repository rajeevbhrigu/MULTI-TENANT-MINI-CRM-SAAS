import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { withTenantContext } from "@/server/db/tenant-context";
import type { LeadSource } from "@prisma/client";

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "campaigns.view");
  if (permError) return permError;

  const campaigns = await withTenantContext(ctx.tenantId, (tx) =>
    tx.campaign.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: "desc" } }),
  );
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "campaigns.manage");
  if (permError) return permError;

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 422 });

  const campaign = await withTenantContext(ctx.tenantId, (tx) =>
    tx.campaign.create({ data: { tenantId: ctx.tenantId, name: body.name, platform: (body.platform as LeadSource) ?? "OTHER" } }),
  );
  return NextResponse.json(campaign, { status: 201 });
}
