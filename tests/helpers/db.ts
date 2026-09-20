import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export const prisma = new PrismaClient();

export async function createTestTenant(namePrefix: string) {
  const suffix = randomUUID().slice(0, 8);
  const tenant = await prisma.tenant.create({
    data: { companyName: `${namePrefix} ${suffix}`, slug: `${namePrefix.toLowerCase().replace(/\s+/g, "-")}-${suffix}` },
  });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
    await tx.leadCounter.create({ data: { tenantId: tenant.id, value: 0 } });
  });
  return tenant;
}

export async function createTestUser(emailPrefix: string) {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: { fullName: `Test User ${suffix}`, email: `${emailPrefix}-${suffix}@test.minicrm.example`, passwordHash: "test-hash" },
  });
}

export async function addMembership(tenantId: string, userId: string, role: "OWNER" | "ADMIN" | "MANAGER" | "SALES_AGENT" | "VIEWER" = "OWNER") {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    await tx.tenantUser.create({ data: { tenantId, userId, role, status: "ACTIVE" } });
  });
}

export async function cleanupTenant(tenantId: string) {
  // FK cascade deletes on RLS-protected child tables still evaluate the
  // policy, so this needs the platform-admin bypass rather than a bare delete.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
    await tx.tenant.delete({ where: { id: tenantId } });
  }).catch(() => undefined);
}

export async function cleanupUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}
