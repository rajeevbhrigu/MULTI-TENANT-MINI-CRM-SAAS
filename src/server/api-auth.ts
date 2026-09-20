import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getSession } from "@/server/auth/session";
import { hashToken } from "@/lib/crypto";
import { getPermissionsForRole, hasPermission, type Permission } from "@/server/permissions";
import type { TenantRole } from "@prisma/client";
import { checkRateLimit } from "@/server/rate-limit";

export type ApiContext = {
  tenantId: string;
  userId: string | null;
  role: TenantRole;
  permissions: Permission[];
  authMethod: "session" | "api_key";
};

/**
 * Resolves tenant + permissions for an /api/v1 request from EITHER a valid
 * session cookie (same-origin app usage) OR a Bearer API key
 * (`Authorization: Bearer mcrm_live_...`). The tenant id always comes from
 * server-side state (session membership or the API key's owning tenant) -
 * a tenantId in the request body/query is never trusted.
 */
export async function resolveApiContext(req: NextRequest): Promise<ApiContext | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice("Bearer ".length).trim();

    const rl = await checkRateLimit(`api:${hashToken(key)}`, 300, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const record = await prisma.apiKey.findUnique({ where: { keyHash: hashToken(key) } });
    if (!record || record.revokedAt) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const membership = await prisma.tenantUser.findFirst({
      where: { tenantId: record.tenantId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
    });
    // API keys act with admin-equivalent tenant access; a disabled/ownerless
    // workspace cannot be reached through the API either.
    if (!membership) {
      return NextResponse.json({ error: "Workspace is not active" }, { status: 403 });
    }

    await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });

    return {
      tenantId: record.tenantId,
      userId: null,
      role: "ADMIN",
      permissions: getPermissionsForRole("ADMIN"),
      authMethod: "api_key",
    };
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 403 });

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    tenantId,
    userId: session.user.id,
    role: membership.role,
    permissions: getPermissionsForRole(membership.role, membership.customPermissions),
    authMethod: "session",
  };
}

export function requireApiPermission(ctx: ApiContext, permission: Permission): NextResponse | null {
  if (!hasPermission(ctx.role, permission)) {
    return NextResponse.json({ error: `Missing permission: ${permission}` }, { status: 403 });
  }
  return null;
}

export function isApiError(x: ApiContext | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}
