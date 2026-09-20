"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PriorityBadge } from "@/components/ui/badge";
import { moveLeadToStageAction } from "@/server/actions/pipeline";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

export type KanbanLead = {
  id: string;
  name: string;
  company: string | null;
  priority: string;
  dealValue: number | null;
  assignedTo: { fullName: string } | null;
};

export type KanbanStage = {
  id: string;
  name: string;
  color: string;
  leads: KanbanLead[];
};

export function KanbanBoard({ pipelineId, stages, currency }: { pipelineId: string; stages: KanbanStage[]; currency: string }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const total = stage.leads.reduce((s, l) => s + (l.dealValue ?? 0), 0);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const leadId = e.dataTransfer.getData("text/plain");
              if (leadId) startTransition(async () => { await moveLeadToStageAction(leadId, pipelineId, stage.id); router.refresh(); });
              setDragging(null);
            }}
            className="w-72 shrink-0 rounded-lg border border-border bg-surface"
          >
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                <span className="text-sm font-semibold">{stage.name}</span>
              </div>
              <span className="rounded-full bg-muted-surface px-2 py-0.5 text-xs">{stage.leads.length}</span>
            </div>
            {total > 0 && <p className="px-3 pt-2 text-xs text-muted">{formatCurrency(total, currency)}</p>}
            <div className="max-h-[65vh] space-y-2 overflow-y-auto p-3 scrollbar-thin">
              {stage.leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", lead.id);
                    setDragging(lead.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    "block rounded-md border border-border bg-surface p-3 text-sm shadow-sm hover:border-brand",
                    dragging === lead.id && "opacity-50",
                  )}
                >
                  <p className="font-medium">{lead.name}</p>
                  {lead.company && <p className="text-xs text-muted">{lead.company}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <PriorityBadge priority={lead.priority} />
                    <span className="text-xs text-muted">{lead.assignedTo?.fullName ?? "Unassigned"}</span>
                  </div>
                </Link>
              ))}
              {stage.leads.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted">Drop leads here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
