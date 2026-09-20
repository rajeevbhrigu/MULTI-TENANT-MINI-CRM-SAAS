"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import { destroySession } from "@/server/auth/session";
import type { ActionState } from "@/server/actions/auth";

export async function updateWorkspaceSettingsAction(formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "settings.edit");

  const data = {
    companyName: String(formData.get("companyName") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? "Asia/Kolkata"),
    currency: String(formData.get("currency") ?? "INR"),
    country: String(formData.get("country") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  };

  await withTenantContext(ctx.tenant.id, (tx) => tx.tenant.update({ where: { id: ctx.tenant.id }, data }));

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "settings.updated", entityType: "Tenant", entityId: ctx.tenant.id, newValues: data });

  revalidatePath("/settings");
}

export async function requestWorkspaceDeletionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireTenantContext();
  if (ctx.membership.role !== "OWNER") return { error: "Only the workspace owner can delete the workspace." };

  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== ctx.tenant.companyName) {
    return { error: "Type your company name exactly to confirm." };
  }

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.tenant.update({ where: { id: ctx.tenant.id }, data: { deletedAt: new Date(), status: "CANCELLED" } }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "workspace.deletion_requested", entityType: "Tenant", entityId: ctx.tenant.id });

  await destroySession();
  redirect("/login");
}

export async function exportAccountDataAction(): Promise<void> {
  const ctx = await requireTenantContext();
  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "account.data_export_requested", entityType: "Tenant", entityId: ctx.tenant.id });
}
