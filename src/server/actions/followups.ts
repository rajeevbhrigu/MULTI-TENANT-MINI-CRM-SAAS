"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import type { LeadPriority } from "@prisma/client";

export async function createFollowupAction(formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.edit");

  const leadId = String(formData.get("leadId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "");
  const priority = (String(formData.get("priority") ?? "MEDIUM") as LeadPriority);
  const assignedToId = String(formData.get("assignedToId") ?? "") || ctx.session.user.id;

  if (!title || !dueDate) return;

  const followup = await withTenantContext(ctx.tenant.id, async (tx) => {
    const f = await tx.followup.create({
      data: {
        tenantId: ctx.tenant.id, leadId, title, description,
        dueDate: new Date(dueDate), priority, assignedToId, createdById: ctx.session.user.id,
      },
    });
    await tx.lead.update({ where: { id: leadId }, data: { nextFollowupAt: f.dueDate } });
    await tx.activity.create({
      data: { tenantId: ctx.tenant.id, leadId, userId: ctx.session.user.id, type: "FOLLOW_UP", channel: "MANUAL", subject: `Follow-up scheduled: ${title}` },
    });
    return f;
  });

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "followup.created", entityType: "Followup", entityId: followup.id });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/followups");
}

export async function completeFollowupAction(followupId: string): Promise<void> {
  const ctx = await requireTenantContext();
  const f = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.followup.update({ where: { id: followupId }, data: { status: "COMPLETED", completedAt: new Date() } }),
  );
  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "followup.completed", entityType: "Followup", entityId: followupId });
  revalidatePath(`/leads/${f.leadId}`);
  revalidatePath("/followups");
}

export async function cancelFollowupAction(followupId: string): Promise<void> {
  const ctx = await requireTenantContext();
  const f = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.followup.update({ where: { id: followupId }, data: { status: "CANCELLED" } }),
  );
  revalidatePath(`/leads/${f.leadId}`);
  revalidatePath("/followups");
}

export async function rescheduleFollowupAction(followupId: string, dueDate: string): Promise<void> {
  const ctx = await requireTenantContext();
  const f = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.followup.update({ where: { id: followupId }, data: { dueDate: new Date(dueDate), status: "PENDING" } }),
  );
  revalidatePath(`/leads/${f.leadId}`);
  revalidatePath("/followups");
}

export async function reassignFollowupAction(followupId: string, assignedToId: string): Promise<void> {
  const ctx = await requireTenantContext();
  const f = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.followup.update({ where: { id: followupId }, data: { assignedToId } }),
  );
  revalidatePath(`/leads/${f.leadId}`);
  revalidatePath("/followups");
}
