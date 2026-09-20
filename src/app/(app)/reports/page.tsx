import Link from "next/link";
import { Download } from "lucide-react";
import { requireTenantContext } from "@/server/tenant";
import { getReportData, type ReportType } from "@/server/queries/reports";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const REPORTS: { key: ReportType; label: string }[] = [
  { key: "leads", label: "Lead Report" },
  { key: "source", label: "Source Report" },
  { key: "campaign", label: "Campaign Report" },
  { key: "sales", label: "Sales Report" },
  { key: "team", label: "Team Report" },
  { key: "conversion", label: "Conversion Report" },
  { key: "followup", label: "Follow-up Report" },
  { key: "customer", label: "Customer Report" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const ctx = await requireTenantContext();
  const { type: typeParam } = await searchParams;
  const type = (REPORTS.find((r) => r.key === typeParam)?.key ?? "leads") as ReportType;

  const rows = (await getReportData(ctx.tenant.id, type)) ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>
        <LinkButton href={`/api/v1/reports/export?type=${type}`} variant="secondary" size="sm">
          <Download className="h-4 w-4" /> Export CSV
        </LinkButton>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={`/reports?type=${r.key}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              type === r.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              {columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {columns.map((c) => <td key={c} className="px-4 py-3">{String((row as Record<string, unknown>)[c])}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length || 1} className="px-4 py-12 text-center text-sm text-muted">No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
