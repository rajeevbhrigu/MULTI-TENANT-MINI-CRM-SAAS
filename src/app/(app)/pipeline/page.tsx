import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { createPipelineAction } from "@/server/actions/pipeline";
import { KanbanBoard, type KanbanStage } from "./kanban-board";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ pipelineId?: string }>;
}) {
  const ctx = await requireTenantContext();
  const { pipelineId } = await searchParams;

  const pipelines = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.pipeline.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: { createdAt: "asc" } }),
  );

  const activePipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines.find((p) => p.isDefault) ?? pipelines[0];

  let stages: KanbanStage[] = [];
  if (activePipeline) {
    const pipelineStages = await withTenantContext(ctx.tenant.id, (tx) =>
      tx.pipelineStage.findMany({
        where: { tenantId: ctx.tenant.id, pipelineId: activePipeline.id },
        orderBy: { sortOrder: "asc" },
        include: {
          leadStages: {
            where: { exitedAt: null, tenantId: ctx.tenant.id },
            include: { lead: { include: { assignedTo: true } } },
          },
        },
      }),
    );

    stages = pipelineStages.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      leads: s.leadStages
        .filter((ls) => !ls.lead.deletedAt)
        .map((ls) => ({
          id: ls.lead.id,
          name: ls.lead.name,
          company: ls.lead.company,
          priority: ls.lead.priority,
          dealValue: ls.dealValue ? Number(ls.dealValue) : null,
          assignedTo: ls.lead.assignedTo ? { fullName: ls.lead.assignedTo.fullName } : null,
        })),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted">Drag leads between stages to update their status.</p>
        </div>
        <form action={createPipelineAction} className="flex items-center gap-2">
          <input type="hidden" name="name" value="New Pipeline" />
          <input type="hidden" name="type" value="CUSTOM" />
          <Button type="submit" size="sm" variant="secondary"><Plus className="h-4 w-4" /> New Pipeline</Button>
        </form>
      </div>

      <div className="flex gap-2 border-b border-border">
        {pipelines.map((p) => (
          <Link
            key={p.id}
            href={`/pipeline?pipelineId=${p.id}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              activePipeline?.id === p.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {activePipeline ? (
        <KanbanBoard pipelineId={activePipeline.id} stages={stages} currency={ctx.tenant.currency} />
      ) : (
        <p className="text-sm text-muted">No pipeline yet.</p>
      )}
    </div>
  );
}
