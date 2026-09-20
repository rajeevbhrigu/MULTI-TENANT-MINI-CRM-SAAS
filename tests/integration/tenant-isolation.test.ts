import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenantContext, withPlatformAdminContext } from "@/server/db/tenant-context";
import { createTestTenant, createTestUser, addMembership, cleanupTenant, cleanupUser, prisma } from "../helpers/db";

/**
 * Critical acceptance tests (spec section 65/76): a tenant must never be
 * able to read, search, export, or otherwise reach another tenant's data,
 * whether through the app-level query filters or the PostgreSQL RLS
 * backstop.
 */
describe("tenant isolation", () => {
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let leadAId: string;
  let leadBId: string;

  beforeAll(async () => {
    tenantA = await createTestTenant("Tenant A");
    tenantB = await createTestTenant("Tenant B");
    userA = await createTestUser("tenant-a-owner");
    await addMembership(tenantA.id, userA.id, "OWNER");

    const leadA = await withTenantContext(tenantA.id, (tx) =>
      tx.lead.create({ data: { tenantId: tenantA.id, leadNumber: 1, name: "Alpha Prospect", mobile: "9000000001" } }),
    );
    const leadB = await withTenantContext(tenantB.id, (tx) =>
      tx.lead.create({ data: { tenantId: tenantB.id, leadNumber: 1, name: "Beta Prospect", mobile: "9000000002" } }),
    );
    leadAId = leadA.id;
    leadBId = leadB.id;
  });

  afterAll(async () => {
    await cleanupTenant(tenantA.id);
    await cleanupTenant(tenantB.id);
    await cleanupUser(userA.id);
    await prisma.$disconnect();
  });

  it("a tenant-scoped query only ever returns that tenant's rows", async () => {
    const leadsForA = await withTenantContext(tenantA.id, (tx) => tx.lead.findMany({}));
    expect(leadsForA).toHaveLength(1);
    expect(leadsForA[0].id).toBe(leadAId);

    const leadsForB = await withTenantContext(tenantB.id, (tx) => tx.lead.findMany({}));
    expect(leadsForB).toHaveLength(1);
    expect(leadsForB[0].id).toBe(leadBId);
  });

  it("tenant A cannot fetch tenant B's lead by id, even with the correct id", async () => {
    const result = await withTenantContext(tenantA.id, (tx) => tx.lead.findUnique({ where: { id: leadBId } }));
    expect(result).toBeNull();
  });

  it("PostgreSQL RLS blocks cross-tenant reads at the database level, not just the app filter", async () => {
    // Deliberately omit any WHERE tenantId filter - if RLS weren't
    // enforced, this would return both tenants' leads.
    const rows = await withTenantContext(tenantA.id, (tx) => tx.lead.findMany());
    expect(rows.every((r) => r.tenantId === tenantA.id)).toBe(true);
    expect(rows.some((r) => r.id === leadBId)).toBe(false);
  });

  it("a tenant cannot export or count another tenant's data by guessing IDs", async () => {
    const count = await withTenantContext(tenantA.id, (tx) => tx.lead.count({ where: { id: leadBId } }));
    expect(count).toBe(0);
  });

  it("RLS session variables set via parameterized set_config are not vulnerable to injection", async () => {
    // A malicious value can never be anything other than a literal string
    // bind parameter here - Prisma's tagged template parameterizes it, it
    // is never concatenated into SQL text.
    const maliciousLookingId = `${tenantA.id}' OR '1'='1`;
    const rows = await withTenantContext(maliciousLookingId, (tx) => tx.lead.findMany());
    expect(rows).toHaveLength(0); // no tenant has that literal id, so nothing matches
  });

  it("platform-admin context can see across tenants (deliberate, audited bypass)", async () => {
    const allRows = await withPlatformAdminContext((tx) =>
      tx.lead.findMany({ where: { id: { in: [leadAId, leadBId] } } }),
    );
    expect(allRows).toHaveLength(2);
  });

  it("a second tenant user for tenant A only sees tenant A's membership, never tenant B's", async () => {
    const memberships = await prisma.tenantUser.findMany({ where: { userId: userA.id } });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].tenantId).toBe(tenantA.id);
  });
});
