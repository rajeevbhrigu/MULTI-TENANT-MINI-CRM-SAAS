import { NextRequest, NextResponse } from "next/server";
import { resolveApiContext, requireApiPermission, isApiError } from "@/server/api-auth";
import { getReportData, type ReportType } from "@/server/queries/reports";
import { toCsv } from "@/lib/csv";
import { recordAudit } from "@/server/audit";

const VALID: ReportType[] = ["leads", "source", "campaign", "sales", "team", "conversion", "followup", "customer"];

export async function GET(req: NextRequest) {
  const ctx = await resolveApiContext(req);
  if (isApiError(ctx)) return ctx;

  const permError = requireApiPermission(ctx, "reports.view");
  if (permError) return permError;

  const type = req.nextUrl.searchParams.get("type") as ReportType;
  if (!VALID.includes(type)) return NextResponse.json({ error: "Invalid report type" }, { status: 400 });

  const rows = (await getReportData(ctx.tenantId, type)) ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const csv = toCsv(rows as Record<string, unknown>[], columns);

  await recordAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: "report.exported", entityType: "Report", newValues: { type, count: rows.length } });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
