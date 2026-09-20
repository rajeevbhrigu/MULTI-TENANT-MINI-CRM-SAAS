import Link from "next/link";
import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const CHANNEL_TONE: Record<string, "brand" | "info" | "success" | "neutral"> = {
  WHATSAPP: "success", FACEBOOK: "info", INSTAGRAM: "brand", GMAIL: "neutral", CALL: "brand", SYSTEM: "neutral", MANUAL: "neutral",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const ctx = await requireTenantContext();
  const { type } = await searchParams;

  const activities = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.activity.findMany({
      where: { tenantId: ctx.tenant.id, ...(type && { type: type as never }) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { lead: true, customer: true, user: true },
    }),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Activities</h1>
        <p className="text-sm text-muted">A complete, append-only timeline across every lead and customer.</p>
      </div>
      <Card className="divide-y divide-border p-0">
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm">
            <Badge tone={CHANNEL_TONE[a.channel] ?? "neutral"}>{a.channel}</Badge>
            <div className="flex-1">
              <p className="font-medium">{a.subject ?? a.type.replace("_", " ")}</p>
              {a.description && <p className="text-muted">{a.description}</p>}
              <p className="mt-0.5 text-xs text-muted">
                {a.lead && <Link href={`/leads/${a.lead.id}`} className="hover:text-brand">{a.lead.name}</Link>}
                {a.customer && <Link href={`/customers/${a.customer.id}`} className="hover:text-brand">{a.customer.name}</Link>}
                {" · "}{a.user?.fullName ?? "System"} · {formatDistanceToNow(a.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && <p className="p-8 text-center text-sm text-muted">No activity yet.</p>}
      </Card>
    </div>
  );
}
