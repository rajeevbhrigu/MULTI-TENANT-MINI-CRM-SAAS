"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import { generateToken, hashToken } from "@/lib/crypto";

export async function createApiKeyAction(formData: FormData): Promise<{ key: string } | { error: string }> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "api_keys.manage");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const secret = generateToken(24);
  const key = `mcrm_live_${secret}`;
  const keyPrefix = key.slice(0, 16);

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.apiKey.create({
      data: { tenantId: ctx.tenant.id, name, keyPrefix, keyHash: hashToken(key), createdById: ctx.session.user.id },
    }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "api_key.created", entityType: "ApiKey", newValues: { name, keyPrefix } });

  revalidatePath("/settings/api-keys");
  return { key };
}

export async function revokeApiKeyAction(keyId: string): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "api_keys.manage");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.apiKey.updateMany({ where: { id: keyId, tenantId: ctx.tenant.id }, data: { revokedAt: new Date() } }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "api_key.revoked", entityType: "ApiKey", entityId: keyId });

  revalidatePath("/settings/api-keys");
}
