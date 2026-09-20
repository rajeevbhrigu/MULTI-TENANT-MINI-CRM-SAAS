"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import type { AutomationEvent } from "@prisma/client";
import type { ActionState } from "@/server/actions/auth";

export async function createAutomationRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "automation.manage");

  const name = String(formData.get("name") ?? "").trim();
  const triggerEvent = String(formData.get("triggerEvent") ?? "") as AutomationEvent;
  const conditionsRaw = String(formData.get("conditions") ?? "[]");
  const actionsRaw = String(formData.get("actions") ?? "[]");

  if (!name || !triggerEvent) return { error: "Name and trigger event are required." };

  let conditions: unknown, actions: unknown;
  try {
    conditions = JSON.parse(conditionsRaw);
    actions = JSON.parse(actionsRaw);
  } catch {
    return { error: "Conditions and actions must be valid JSON." };
  }

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.automationRule.create({
      data: { tenantId: ctx.tenant.id, name, triggerEvent, conditions: conditions as object, actions: actions as object },
    }),
  );

  revalidatePath("/settings/automation");
  return {};
}

export async function toggleAutomationRuleAction(ruleId: string, isActive: boolean): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "automation.manage");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.automationRule.updateMany({ where: { id: ruleId, tenantId: ctx.tenant.id }, data: { isActive } }),
  );

  revalidatePath("/settings/automation");
}
