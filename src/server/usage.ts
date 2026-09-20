import "server-only";
import { prisma } from "@/server/db/client";
import { withTenantContext } from "@/server/db/tenant-context";

export class UsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageLimitError";
  }
}

/**
 * Enforces plan limits server-side (never just hidden in the UI). Manual
 * creation flows throw and surface a clear error; inbound integration leads
 * should instead queue for retry rather than silently dropping - see
 * src/server/integrations/lead-intake.ts.
 */
export async function assertWithinLeadLimit(tenantId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  if (!subscription) return; // no subscription record yet (shouldn't happen post-signup)

  const count = await withTenantContext(tenantId, (tx) => tx.lead.count({ where: { tenantId, deletedAt: null } }));
  if (count >= subscription.plan.maxLeads) {
    throw new UsageLimitError(
      `Your ${subscription.plan.name} plan allows up to ${subscription.plan.maxLeads} leads. Upgrade your plan to add more.`,
    );
  }
}

export async function assertWithinUserLimit(tenantId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  if (!subscription) return;

  const count = await prisma.tenantUser.count({ where: { tenantId, status: { in: ["ACTIVE", "INVITED"] } } });
  if (count >= subscription.plan.maxUsers) {
    throw new UsageLimitError(
      `Your ${subscription.plan.name} plan allows up to ${subscription.plan.maxUsers} users. Upgrade your plan to invite more.`,
    );
  }
}

export async function getUsageSummary(tenantId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } });
  if (!subscription) return null;

  const [leads, users, messages] = await Promise.all([
    withTenantContext(tenantId, (tx) => tx.lead.count({ where: { tenantId, deletedAt: null } })),
    prisma.tenantUser.count({ where: { tenantId, status: "ACTIVE" } }),
    withTenantContext(tenantId, (tx) => tx.message.count({ where: { tenantId } })),
  ]);

  return {
    plan: subscription.plan,
    subscription,
    usage: {
      leads: { used: leads, limit: subscription.plan.maxLeads },
      users: { used: users, limit: subscription.plan.maxUsers },
      messages: { used: messages, limit: subscription.plan.maxMessages },
    },
  };
}
