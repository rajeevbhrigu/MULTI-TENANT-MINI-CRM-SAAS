import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { getSession, type AuthedSession } from "@/server/auth/session";
import {
  getPermissionsForRole,
  hasPermission,
  ForbiddenError,
  type Permission,
} from "@/server/permissions";
import type { TenantRole } from "@prisma/client";

export type TenantContext = {
  session: AuthedSession;
  tenant: {
    id: string;
    companyName: string;
    slug: string;
    logoUrl: string | null;
    timezone: string;
    currency: string;
    status: string;
  };
  membership: {
    id: string;
    role: TenantRole;
    customPermissions: unknown;
  };
  permissions: Permission[];
};

/**
 * Resolves the tenant for the current request from the AUTHENTICATED SESSION
 * only - the active tenant id lives server-side on the Session row and is
 * validated against an ACTIVE TenantUser membership on every call. A
 * tenantId supplied by the client (query param, header, body) is never
 * trusted for this resolution.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getSession();
  if (!session) return null;

  let tenantId = session.activeTenantId;

  if (!tenantId) {
    const firstMembership = await prisma.tenantUser.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (!firstMembership) return null;
    tenantId = firstMembership.tenantId;
  }

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } },
    include: { tenant: true },
  });

  if (!membership || membership.status !== "ACTIVE" || membership.tenant.deletedAt) {
    return null;
  }

  return {
    session,
    tenant: {
      id: membership.tenant.id,
      companyName: membership.tenant.companyName,
      slug: membership.tenant.slug,
      logoUrl: membership.tenant.logoUrl,
      timezone: membership.tenant.timezone,
      currency: membership.tenant.currency,
      status: membership.tenant.status,
    },
    membership: {
      id: membership.id,
      role: membership.role,
      customPermissions: membership.customPermissions,
    },
    permissions: getPermissionsForRole(membership.role, membership.customPermissions),
  };
}

/** For server components/pages: redirects to /login if unauthenticated or without a workspace. */
export async function requireTenantContext(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export function requirePermission(ctx: TenantContext, permission: Permission): void {
  if (!hasPermission(ctx.membership.role, permission, ctx.membership.customPermissions)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

export { ForbiddenError };
