"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import { getPaymentProvider } from "@/server/billing/provider";
import { prisma } from "@/server/db/client";

export async function changePlanAction(planId: string): Promise<{ error?: string }> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "billing.manage");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Plan not found." };

  const subscription = await prisma.subscription.findUnique({ where: { tenantId: ctx.tenant.id } });
  if (!subscription) return { error: "No subscription found." };

  if (Number(plan.price) > 0) {
    const result = await getPaymentProvider().charge({
      amount: Number(plan.price), currency: plan.currency, description: `MiniCRM ${plan.name} plan`,
    });
    if (!result.success) return { error: result.error };
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + (plan.billingInterval === "YEARLY" ? 12 : 1));

  await withTenantContext(ctx.tenant.id, async (tx) => {
    await tx.subscription.update({
      where: { tenantId: ctx.tenant.id },
      data: { planId: plan.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, provider: getPaymentProvider().name },
    });
    if (Number(plan.price) > 0) {
      const invoice = await tx.invoice.create({
        data: {
          subscriptionId: subscription.id, amount: plan.price, currency: plan.currency, status: "PAID",
          provider: getPaymentProvider().name, issuedAt: now, paidAt: now, periodStart: now, periodEnd,
        },
      });
      await tx.payment.create({
        data: { invoiceId: invoice.id, amount: plan.price, currency: plan.currency, provider: getPaymentProvider().name, status: "SUCCEEDED" },
      });
    }
  });

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "billing.plan_changed", entityType: "Subscription", entityId: subscription.id, newValues: { planId } });

  revalidatePath("/settings/billing");
  return {};
}

export async function cancelSubscriptionAction(): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "billing.manage");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.subscription.update({ where: { tenantId: ctx.tenant.id }, data: { status: "CANCELLED", cancelledAt: new Date() } }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "billing.cancelled", entityType: "Subscription" });

  revalidatePath("/settings/billing");
}
