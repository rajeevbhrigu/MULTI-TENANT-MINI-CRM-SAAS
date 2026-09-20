"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadPriority, LeadSource, LeadStatusValue } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import { assertWithinLeadLimit } from "@/server/usage";
import { notifyLeadership } from "@/server/notify";
import { runAutomationsForEvent } from "@/server/automation/engine";
import type { ActionState } from "@/server/actions/auth";

export async function createLeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.create");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { fieldErrors: { name: "Name is required." } };

  try {
    await assertWithinLeadLimit(ctx.tenant.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unable to create lead." };
  }

  const mobile = String(formData.get("mobile") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;
  const source = (String(formData.get("source") ?? "MANUAL") as LeadSource);
  const priority = (String(formData.get("priority") ?? "MEDIUM") as LeadPriority);
  const assignedToId = String(formData.get("assignedToId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim();

  const lead = await withTenantContext(ctx.tenant.id, async (tx) => {
    const counter = await tx.leadCounter.update({
      where: { tenantId: ctx.tenant.id },
      data: { value: { increment: 1 } },
    });

    const lead = await tx.lead.create({
      data: {
        tenantId: ctx.tenant.id,
        leadNumber: counter.value,
        name,
        mobile,
        email,
        company,
        source,
        priority,
        status: "NEW",
        assignedToId,
        createdById: ctx.session.user.id,
        lastActivityAt: new Date(),
      },
    });

    await tx.leadStatusHistory.create({
      data: { tenantId: ctx.tenant.id, leadId: lead.id, newStatus: "NEW", changedById: ctx.session.user.id, reason: "Lead created" },
    });

    await tx.activity.create({
      data: {
        tenantId: ctx.tenant.id,
        leadId: lead.id,
        userId: ctx.session.user.id,
        type: "LEAD_CREATED",
        channel: source === "MANUAL" ? "MANUAL" : (source as never),
        subject: "Lead created",
        description: `Lead created via ${source}`,
      },
    });

    if (notes) {
      await tx.note.create({
        data: { tenantId: ctx.tenant.id, leadId: lead.id, userId: ctx.session.user.id, content: notes },
      });
    }

    const defaultPipeline = await tx.pipeline.findFirst({ where: { tenantId: ctx.tenant.id, isDefault: true } });
    if (defaultPipeline) {
      const stage = await tx.pipelineStage.findFirst({ where: { pipelineId: defaultPipeline.id, status: "NEW" } });
      if (stage) {
        await tx.leadPipelineStage.create({
          data: { tenantId: ctx.tenant.id, leadId: lead.id, pipelineId: defaultPipeline.id, stageId: stage.id },
        });
      }
    }

    if (!assignedToId) {
      await notifyLeadership(tx, ctx.tenant.id, { title: `New lead: ${name}`, body: `via ${source}`, relatedEntityType: "Lead", relatedEntityId: lead.id });
    }

    return lead;
  });

  await runAutomationsForEvent(ctx.tenant.id, "LEAD_CREATED", { leadId: lead.id, priority, status: "NEW", source });

  await recordAudit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.session.user.id,
    action: "lead.created",
    entityType: "Lead",
    entityId: lead.id,
    newValues: { name, mobile, email, source },
  });

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadAction(leadId: string, formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.edit");

  const data = {
    name: String(formData.get("name") ?? "").trim(),
    mobile: String(formData.get("mobile") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    company: String(formData.get("company") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
  };

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.lead.updateMany({ where: { id: leadId, tenantId: ctx.tenant.id }, data }),
  );

  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id,
    action: "lead.updated", entityType: "Lead", entityId: leadId, newValues: data,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function changeLeadStatusAction(leadId: string, newStatus: LeadStatusValue, reason?: string): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.edit");

  const lead = await withTenantContext(ctx.tenant.id, (tx) => tx.lead.findFirst({ where: { id: leadId, tenantId: ctx.tenant.id } }));
  if (!lead) throw new Error("Lead not found");

  await withTenantContext(ctx.tenant.id, async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { status: newStatus, lastActivityAt: new Date() } });
    await tx.leadStatusHistory.create({
      data: { tenantId: ctx.tenant.id, leadId, oldStatus: lead.status, newStatus, changedById: ctx.session.user.id, reason: reason ?? null },
    });
    await tx.activity.create({
      data: {
        tenantId: ctx.tenant.id, leadId, userId: ctx.session.user.id, type: "STATUS_CHANGE", channel: "MANUAL",
        subject: `Status changed: ${lead.status} → ${newStatus}`, description: reason ?? null,
      },
    });

    const pipelineStage = await tx.leadPipelineStage.findFirst({
      where: { tenantId: ctx.tenant.id, leadId, exitedAt: null },
      include: { pipeline: true },
    });
    if (pipelineStage) {
      const nextStage = await tx.pipelineStage.findFirst({ where: { pipelineId: pipelineStage.pipelineId, status: newStatus } });
      if (nextStage && nextStage.id !== pipelineStage.stageId) {
        await tx.leadPipelineStage.update({ where: { id: pipelineStage.id }, data: { exitedAt: new Date() } });
        await tx.leadPipelineStage.create({
          data: { tenantId: ctx.tenant.id, leadId, pipelineId: pipelineStage.pipelineId, stageId: nextStage.id, movedById: ctx.session.user.id },
        });
      }
    }
  });

  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.status_changed",
    entityType: "Lead", entityId: leadId, oldValues: { status: lead.status }, newValues: { status: newStatus },
  });

  await runAutomationsForEvent(ctx.tenant.id, "STATUS_CHANGED", { leadId, priority: lead.priority, status: newStatus, source: lead.source });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
}

export async function assignLeadAction(leadId: string, assignedToId: string | null): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.assign");

  await withTenantContext(ctx.tenant.id, async (tx) => {
    await tx.lead.updateMany({ where: { id: leadId, tenantId: ctx.tenant.id }, data: { assignedToId } });
    await tx.activity.create({
      data: { tenantId: ctx.tenant.id, leadId, userId: ctx.session.user.id, type: "ASSIGNMENT", channel: "MANUAL", subject: "Lead reassigned" },
    });
    if (assignedToId) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenant.id, userId: assignedToId, type: "LEAD_ASSIGNED",
          title: "A lead was assigned to you", relatedEntityType: "Lead", relatedEntityId: leadId,
        },
      });
    }
  });

  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.assigned",
    entityType: "Lead", entityId: leadId, newValues: { assignedToId },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function addNoteAction(leadId: string, content: string): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "activities.create");
  if (!content.trim()) return;

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.note.create({ data: { tenantId: ctx.tenant.id, leadId, userId: ctx.session.user.id, content: content.trim(), isInternal: true } }),
  );

  revalidatePath(`/leads/${leadId}`);
}

export async function addActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "activities.create");

  const leadId = String(formData.get("leadId") ?? "");
  const type = String(formData.get("type") ?? "OTHER") as never;
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  await withTenantContext(ctx.tenant.id, async (tx) => {
    await tx.activity.create({
      data: { tenantId: ctx.tenant.id, leadId, userId: ctx.session.user.id, type, channel: "MANUAL", subject, description },
    });
    await tx.lead.updateMany({ where: { id: leadId, tenantId: ctx.tenant.id }, data: { lastActivityAt: new Date() } });
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function archiveLeadAction(leadId: string): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.delete");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.lead.updateMany({
      where: { id: leadId, tenantId: ctx.tenant.id },
      data: { deletedAt: new Date(), deletedById: ctx.session.user.id },
    }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.deleted", entityType: "Lead", entityId: leadId });

  revalidatePath("/leads");
}

export async function bulkAssignAction(leadIds: string[], assignedToId: string): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.assign");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.lead.updateMany({ where: { id: { in: leadIds }, tenantId: ctx.tenant.id }, data: { assignedToId } }),
  );
  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.bulk_assigned",
    entityType: "Lead", newValues: { leadIds, assignedToId },
  });
  revalidatePath("/leads");
}

export async function bulkStatusAction(leadIds: string[], status: LeadStatusValue): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.edit");

  await withTenantContext(ctx.tenant.id, async (tx) => {
    await tx.lead.updateMany({ where: { id: { in: leadIds }, tenantId: ctx.tenant.id }, data: { status } });
    await tx.leadStatusHistory.createMany({
      data: leadIds.map((leadId) => ({ tenantId: ctx.tenant.id, leadId, newStatus: status, changedById: ctx.session.user.id, reason: "Bulk update" })),
    });
  });

  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.bulk_status_changed",
    entityType: "Lead", newValues: { leadIds, status },
  });
  revalidatePath("/leads");
}

export async function bulkArchiveAction(leadIds: string[]): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.delete");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.lead.updateMany({
      where: { id: { in: leadIds }, tenantId: ctx.tenant.id },
      data: { deletedAt: new Date(), deletedById: ctx.session.user.id },
    }),
  );
  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.bulk_archived",
    entityType: "Lead", newValues: { leadIds },
  });
  revalidatePath("/leads");
}
