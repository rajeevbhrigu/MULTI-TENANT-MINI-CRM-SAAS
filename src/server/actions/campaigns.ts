"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import type { LeadSource } from "@prisma/client";

export async function createCampaignAction(formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "campaigns.manage");

  const name = String(formData.get("name") ?? "").trim();
  const platform = String(formData.get("platform") ?? "OTHER") as LeadSource;
  const budgetRaw = String(formData.get("budget") ?? "");
  if (!name) return;

  const campaign = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.campaign.create({
      data: { tenantId: ctx.tenant.id, name, platform, budget: budgetRaw ? Number(budgetRaw) : null },
    }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "campaign.created", entityType: "Campaign", entityId: campaign.id, newValues: { name, platform } });

  revalidatePath("/campaigns");
}
