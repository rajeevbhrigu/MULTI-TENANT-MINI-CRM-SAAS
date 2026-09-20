"use server";

import { prisma } from "@/server/db/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext } from "@/server/tenant";
import { getAIProvider } from "@/server/ai/provider";

export async function generateLeadSummaryAction(leadId: string): Promise<{ summary: string } | { error: string }> {
  const ctx = await requireTenantContext();

  const lead = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.lead.findFirst({ where: { id: leadId, tenantId: ctx.tenant.id }, include: { _count: { select: { activities: true } } } }),
  );
  if (!lead) return { error: "Lead not found." };

  const ai = getAIProvider();
  const response = await ai.complete({
    feature: "lead_summary",
    input: { name: lead.name, status: lead.status, priority: lead.priority, source: lead.source, activityCount: lead._count.activities },
  });

  await prisma.aiRequestLog.create({
    data: { tenantId: ctx.tenant.id, userId: ctx.session.user.id, provider: response.provider, feature: "lead_summary", entityType: "Lead", entityId: leadId },
  });

  return { summary: response.output };
}

/** Approval step: only after a human explicitly accepts does AI output become a permanent note. */
export async function saveAiSummaryAsNoteAction(leadId: string, content: string): Promise<void> {
  const ctx = await requireTenantContext();

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.note.create({
      data: { tenantId: ctx.tenant.id, leadId, userId: ctx.session.user.id, content: `[AI-generated summary, approved by ${ctx.session.user.fullName}]\n${content}`, isInternal: true },
    }),
  );

  await prisma.aiRequestLog.updateMany({
    where: { tenantId: ctx.tenant.id, entityId: leadId, feature: "lead_summary", approvedAt: null },
    data: { approvedAt: new Date() },
  });
}
