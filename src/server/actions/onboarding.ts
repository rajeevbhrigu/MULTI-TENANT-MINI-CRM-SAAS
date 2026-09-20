"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext } from "@/server/tenant";
import { recordAudit } from "@/server/audit";

export async function updateWorkspaceInfoAction(formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  const industry = String(formData.get("industry") ?? "");
  const teamSize = String(formData.get("teamSize") ?? "");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.tenant.update({
      where: { id: ctx.tenant.id },
      data: { industry, teamSize, onboardingStep: 1 },
    }),
  );
  revalidatePath("/onboarding");
}

export async function setOnboardingStepAction(step: number): Promise<void> {
  const ctx = await requireTenantContext();
  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.tenant.update({ where: { id: ctx.tenant.id }, data: { onboardingStep: step } }),
  );
  revalidatePath("/onboarding");
}

export async function completeOnboardingAction(): Promise<void> {
  const ctx = await requireTenantContext();
  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.tenant.update({
      where: { id: ctx.tenant.id },
      data: { onboardingCompletedAt: new Date(), onboardingStep: 7 },
    }),
  );
  await recordAudit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.session.user.id,
    action: "workspace.onboarding_completed",
    entityType: "Tenant",
    entityId: ctx.tenant.id,
  });
  revalidatePath("/dashboard");
}
