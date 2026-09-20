import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { resolveApiContext, isApiError } from "@/server/api-auth";
import { withTenantContext } from "@/server/db/tenant-context";
import { generateToken, hashToken } from "@/lib/crypto";
import { createTestTenant, createTestUser, addMembership, cleanupTenant, cleanupUser, prisma } from "../helpers/db";

/**
 * Critical acceptance test (spec section 65): "Tenant A API key cannot
 * retrieve Tenant B." resolveApiContext() must resolve tenantId purely from
 * the API key's owning tenant, never from anything the caller supplies.
 */
describe("API key tenant isolation", () => {
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;
  let keyA: string;
  let leadBId: string;

  beforeAll(async () => {
    tenantA = await createTestTenant("API Tenant A");
    tenantB = await createTestTenant("API Tenant B");
    userA = await createTestUser("api-tenant-a-owner");
    userB = await createTestUser("api-tenant-b-owner");
    await addMembership(tenantA.id, userA.id, "OWNER");
    await addMembership(tenantB.id, userB.id, "OWNER");

    keyA = `mcrm_test_${generateToken(16)}`;
    await prisma.apiKey.create({
      data: { tenantId: tenantA.id, name: "Test Key A", keyPrefix: keyA.slice(0, 16), keyHash: hashToken(keyA) },
    });

    const leadB = await withTenantContext(tenantB.id, (tx) =>
      tx.lead.create({ data: { tenantId: tenantB.id, leadNumber: 1, name: "Tenant B Secret Lead" } }),
    );
    leadBId = leadB.id;
  });

  afterAll(async () => {
    await cleanupTenant(tenantA.id);
    await cleanupTenant(tenantB.id);
    await cleanupUser(userA.id);
    await cleanupUser(userB.id);
    await prisma.$disconnect();
  });

  it("resolves the correct tenant for a valid API key", async () => {
    const req = new NextRequest("http://localhost/api/v1/leads", { headers: { authorization: `Bearer ${keyA}` } });
    const ctx = await resolveApiContext(req);
    expect(isApiError(ctx)).toBe(false);
    if (!isApiError(ctx)) {
      expect(ctx.tenantId).toBe(tenantA.id);
      expect(ctx.authMethod).toBe("api_key");
    }
  });

  it("rejects an unknown/invalid API key", async () => {
    const req = new NextRequest("http://localhost/api/v1/leads", { headers: { authorization: "Bearer mcrm_test_does_not_exist" } });
    const ctx = await resolveApiContext(req);
    expect(isApiError(ctx)).toBe(true);
  });

  it("tenant A's API key can never resolve tenant B's data, even querying tenant B's lead id directly", async () => {
    const req = new NextRequest("http://localhost/api/v1/leads", { headers: { authorization: `Bearer ${keyA}` } });
    const ctx = await resolveApiContext(req);
    if (isApiError(ctx)) throw new Error("expected valid context");

    // Even if a caller with tenant A's key knew tenant B's lead id, the
    // resolved tenantId (A) is what every subsequent query is scoped by.
    const result = await withTenantContext(ctx.tenantId, (tx) => tx.lead.findUnique({ where: { id: leadBId } }));
    expect(result).toBeNull();
  });

  // The no-Authorization-header path falls through to session-cookie auth
  // (next/headers `cookies()`), which requires a live Next.js request scope
  // and can't be exercised from a plain test runner - it's covered instead
  // by the Playwright end-to-end smoke test hitting the real dev server.
});
