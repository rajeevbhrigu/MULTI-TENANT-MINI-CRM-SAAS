"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";

export async function moveLeadToStageAction(leadId: string, pipelineId: string, stageId: string): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "pipeline.manage");

  await withTenantContext(ctx.tenant.id, async (tx) => {
    const current = await tx.leadPipelineStage.findFirst({
      where: { tenantId: ctx.tenant.id, leadId, pipelineId, exitedAt: null },
    });
    if (current?.stageId === stageId) return;

    if (current) {
      await tx.leadPipelineStage.update({ where: { id: current.id }, data: { exitedAt: new Date() } });
    }
    await tx.leadPipelineStage.create({
      data: { tenantId: ctx.tenant.id, leadId, pipelineId, stageId, movedById: ctx.session.user.id },
    });

    const stage = await tx.pipelineStage.findUnique({ where: { id: stageId } });
    const lead = await tx.lead.findUnique({ where: { id: leadId } });
    if (stage?.status && lead && stage.status !== lead.status) {
      await tx.lead.update({ where: { id: leadId }, data: { status: stage.status, lastActivityAt: new Date() } });
      await tx.leadStatusHistory.create({
        data: { tenantId: ctx.tenant.id, leadId, oldStatus: lead.status, newStatus: stage.status, changedById: ctx.session.user.id, reason: "Moved on pipeline board" },
      });
      await tx.activity.create({
        data: { tenantId: ctx.tenant.id, leadId, userId: ctx.session.user.id, type: "STATUS_CHANGE", channel: "MANUAL", subject: `Moved to ${stage.name}` },
      });
    }
  });

  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.pipeline_stage_changed",
    entityType: "Lead", entityId: leadId, newValues: { pipelineId, stageId },
  });

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function createPipelineAction(formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "pipeline.manage");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "CUSTOM");
  if (!name) return;

  await withTenantContext(ctx.tenant.id, async (tx) => {
    const pipeline = await tx.pipeline.create({ data: { tenantId: ctx.tenant.id, name, type } });
    const stages = ["New", "In Progress", "Won", "Lost"];
    for (let i = 0; i < stages.length; i++) {
      await tx.pipelineStage.create({ data: { tenantId: ctx.tenant.id, pipelineId: pipeline.id, name: stages[i], sortOrder: i } });
    }
  });

  revalidatePath("/pipeline");
}
