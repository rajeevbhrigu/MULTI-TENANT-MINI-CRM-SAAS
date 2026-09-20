import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { FollowupsBoard, type FollowupRow } from "./followups-board";

export default async function FollowupsPage() {
  const ctx = await requireTenantContext();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));

  const followups = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.followup.findMany({
      where: { tenantId: ctx.tenant.id, status: "PENDING" },
      orderBy: { dueDate: "asc" },
      include: { lead: true, assignedTo: true },
    }),
  );

  const serialize = (f: (typeof followups)[number]): FollowupRow => ({
    id: f.id, title: f.title, dueDate: f.dueDate.toISOString(), priority: f.priority,
    lead: { id: f.lead.id, name: f.lead.name }, assignedTo: { fullName: f.assignedTo.fullName },
  });

  const overdue = followups.filter((f) => f.dueDate < todayStart).map(serialize);
  const today = followups.filter((f) => f.dueDate >= todayStart && f.dueDate <= todayEnd).map(serialize);
  const tomorrow = followups.filter((f) => f.dueDate >= tomorrowStart && f.dueDate <= tomorrowEnd).map(serialize);
  const upcoming = followups.filter((f) => f.dueDate > tomorrowEnd).map(serialize);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Follow-ups</h1>
        <p className="text-sm text-muted">{followups.length} pending follow-ups across your workspace.</p>
      </div>
      <FollowupsBoard overdue={overdue} today={today} tomorrow={tomorrow} upcoming={upcoming} />
    </div>
  );
}
