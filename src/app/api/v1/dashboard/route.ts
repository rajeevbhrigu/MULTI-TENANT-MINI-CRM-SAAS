import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { getDashboardData, resolveDateRange, type DateRangeKey } from "@/server/queries/dashboard";

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;
  const permError = requireApiPermission(ctx, "reports.view");
  if (permError) return permError;

  const range = (req.nextUrl.searchParams.get("range") as DateRangeKey) ?? "30d";
  const data = await getDashboardData(ctx.tenantId, resolveDateRange(range));
  return NextResponse.json(data);
}
