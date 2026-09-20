import { requireTenantContext, requirePermission } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "api_keys.manage");

  const keys = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.apiKey.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: { createdAt: "desc" } }),
  );

  return (
    <ApiKeysClient
      keys={keys.map((k) => ({
        id: k.id, name: k.name, keyPrefix: k.keyPrefix,
        createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null,
      }))}
    />
  );
}
