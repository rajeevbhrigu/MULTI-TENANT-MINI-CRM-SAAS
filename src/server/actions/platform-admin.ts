"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/client";
import { getSession, setActiveTenant } from "@/server/auth/session";
import { withPlatformAdminContext } from "@/server/db/tenant-context";
import { recordAudit } from "@/server/audit";

async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isPlatformAdmin) redirect("/dashboard");
  return session;
}

export async function startSupportSessionAction(formData: FormData): Promise<void> {
  const session = await requirePlatformAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("A reason is required to start support access.");

  await withPlatformAdminContext((tx) =>
    tx.supportAccessSession.create({
      data: { tenantId, adminUserId: session.user.id, reason },
    }),
  );

  await recordAudit({
    tenantId,
    actorUserId: session.user.id,
    action: "support_access.started",
    entityType: "Tenant",
    entityId: tenantId,
    newValues: { reason },
  });

  await setActiveTenant(session.sessionId, tenantId);
  redirect("/dashboard");
}

export async function endSupportSessionAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const active = await withPlatformAdminContext((tx) =>
    tx.supportAccessSession.findFirst({
      where: { adminUserId: session.user.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    }),
  );

  if (active) {
    await withPlatformAdminContext((tx) =>
      tx.supportAccessSession.update({ where: { id: active.id }, data: { endedAt: new Date() } }),
    );
    await recordAudit({
      tenantId: active.tenantId,
      actorUserId: session.user.id,
      action: "support_access.ended",
      entityType: "Tenant",
      entityId: active.tenantId,
    });
  }

  redirect("/platform-admin");
}

export async function setTenantStatusAction(tenantId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void> {
  const session = await requirePlatformAdmin();

  await withPlatformAdminContext((tx) => tx.tenant.update({ where: { id: tenantId }, data: { status } }));

  await recordAudit({
    tenantId,
    actorUserId: session.user.id,
    action: status === "SUSPENDED" ? "tenant.suspended" : "tenant.activated",
    entityType: "Tenant",
    entityId: tenantId,
  });

  revalidatePath("/platform-admin");
}

export { requirePlatformAdmin };
