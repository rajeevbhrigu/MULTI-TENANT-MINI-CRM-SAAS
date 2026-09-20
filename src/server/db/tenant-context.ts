import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./client";

type TxClient = Prisma.TransactionClient;

/**
 * Runs `fn` inside a transaction with the Postgres session variables that
 * back Row Level Security set for the duration of the transaction only
 * (`SET LOCAL`, scoped to the transaction, never leaks to other requests
 * sharing a pooled connection).
 *
 * This is defense-in-depth: every query issued inside `fn` must still be
 * explicitly filtered by tenantId in application code (see src/server/repo/*).
 * RLS is the backstop for the case where a query forgets to do so.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.is_platform_admin', 'false', true)`;
    return fn(tx);
  });
}

/**
 * Platform-admin context: intentionally bypasses tenant RLS for
 * cross-tenant operations (the platform admin console). Must only ever be
 * reached after verifying `user.isPlatformAdmin` server-side - never from
 * client-controlled input.
 */
export async function withPlatformAdminContext<T>(
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
    return fn(tx);
  });
}

export type { PrismaClient };
