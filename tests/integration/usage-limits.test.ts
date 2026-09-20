import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { assertWithinLeadLimit, UsageLimitError } from "@/server/usage";
import { createTestTenant, cleanupTenant, prisma } from "../helpers/db";

describe("subscription usage limits", () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let planId: string;

  beforeAll(async () => {
    tenant = await createTestTenant("Usage Limit Tenant");

    const plan = await prisma.plan.upsert({
      where: { code: "test_tiny_plan" },
      update: {},
      create: {
        code: "test_tiny_plan", name: "Test Tiny Plan", price: 0, currency: "INR",
        billingInterval: "MONTHLY", trialDays: 14, maxUsers: 1, maxLeads: 2, maxMessages: 10, maxStorageMb: 10,
        features: {},
      },
    });
    planId = plan.id;

    await prisma.subscription.create({
      data: { tenantId: tenant.id, planId, status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
    await prisma.$disconnect();
  });

  it("allows lead creation while under the plan's maxLeads", async () => {
    await expect(assertWithinLeadLimit(tenant.id)).resolves.not.toThrow();

    await withTenantContext(tenant.id, (tx) => tx.lead.create({ data: { tenantId: tenant.id, leadNumber: 1, name: "Lead One" } }));
  });

  it("blocks lead creation once the plan's maxLeads is reached, with a clear error (never a silent drop)", async () => {
    await withTenantContext(tenant.id, (tx) => tx.lead.create({ data: { tenantId: tenant.id, leadNumber: 2, name: "Lead Two" } }));

    await expect(assertWithinLeadLimit(tenant.id)).rejects.toThrow(UsageLimitError);
    await expect(assertWithinLeadLimit(tenant.id)).rejects.toThrow(/plan allows up to 2 leads/);
  });
});
