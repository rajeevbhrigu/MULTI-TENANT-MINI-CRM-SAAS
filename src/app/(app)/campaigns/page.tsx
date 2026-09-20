import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { NewCampaignForm } from "./new-campaign-form";

export default async function CampaignsPage() {
  const ctx = await requireTenantContext();

  const campaigns = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.campaign.findMany({
      where: { tenantId: ctx.tenant.id },
      orderBy: { createdAt: "desc" },
      include: {
        leads: { select: { status: true } },
      },
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted">Attribution from lead to campaign is retained permanently, even after conversion.</p>
        </div>
        <NewCampaignForm />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => {
          const leads = c.leads.length;
          const qualified = c.leads.filter((l) => ["QUALIFIED", "HOT", "FOLLOW_UP", "SALE", "CUSTOMER"].includes(l.status)).length;
          const hot = c.leads.filter((l) => l.status === "HOT").length;
          const sales = c.leads.filter((l) => l.status === "SALE" || l.status === "CUSTOMER").length;
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{c.name}</p>
                <span className="text-xs text-muted">{c.platform}</span>
              </div>
              {c.budget && <p className="mt-1 text-xs text-muted">Budget: {formatCurrency(Number(c.budget), ctx.tenant.currency)}</p>}
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <div><p className="text-lg font-bold">{leads}</p><p className="text-muted">Leads</p></div>
                <div><p className="text-lg font-bold">{qualified}</p><p className="text-muted">Qualified</p></div>
                <div><p className="text-lg font-bold">{hot}</p><p className="text-muted">Hot</p></div>
                <div><p className="text-lg font-bold">{sales}</p><p className="text-muted">Sales</p></div>
              </div>
            </Card>
          );
        })}
        {campaigns.length === 0 && <p className="text-sm text-muted">No campaigns yet.</p>}
      </div>
    </div>
  );
}
