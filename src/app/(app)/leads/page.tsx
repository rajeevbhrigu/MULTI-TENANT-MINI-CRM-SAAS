import { Plus, Download, Upload } from "lucide-react";
import { requireTenantContext } from "@/server/tenant";
import { prisma } from "@/server/db/client";
import { listLeads, type LeadFilters } from "@/server/queries/leads";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { LeadsFilters } from "@/components/app/leads-filters";
import { LeadsTable, type LeadRow } from "@/components/app/leads-table";
import { Pagination } from "@/components/app/pagination";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireTenantContext();
  const sp = await searchParams;

  const filters: LeadFilters = {
    q: sp.q,
    status: sp.status as LeadFilters["status"],
    priority: sp.priority as LeadFilters["priority"],
    source: sp.source as LeadFilters["source"],
    assignedToId: sp.assignedToId,
    sort: sp.sort as LeadFilters["sort"],
    page: sp.page ? Number(sp.page) : 1,
  };

  const [{ leads, total, page, pageCount }, members] = await Promise.all([
    listLeads(ctx.tenant.id, filters),
    prisma.tenantUser.findMany({
      where: { tenantId: ctx.tenant.id, status: "ACTIVE" },
      include: { user: true },
    }),
  ]);

  const memberOptions = members.map((m) => ({ id: m.user.id, fullName: m.user.fullName }));

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    leadNumber: l.leadNumber,
    name: l.name,
    mobile: l.mobile,
    email: l.email,
    source: l.source,
    status: l.status,
    priority: l.priority,
    assignedTo: l.assignedTo ? { id: l.assignedTo.id, fullName: l.assignedTo.fullName } : null,
    campaign: l.campaign,
    nextFollowupAt: l.nextFollowupAt ? l.nextFollowupAt.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
  }));

  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">{total} leads in {ctx.tenant.companyName}</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/api/v1/leads/export?${exportQs}`} variant="secondary" size="sm">
            <Download className="h-4 w-4" /> Export
          </LinkButton>
          <LinkButton href="/leads/import" variant="secondary" size="sm">
            <Upload className="h-4 w-4" /> Import
          </LinkButton>
          <LinkButton href="/leads/new" size="sm">
            <Plus className="h-4 w-4" /> New Lead
          </LinkButton>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <LeadsFilters members={memberOptions} />
        <LeadsTable leads={rows} members={memberOptions} />
        <Pagination page={page} pageCount={pageCount} total={total} />
      </Card>
    </div>
  );
}
