"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/client";
import { requireTenantContext } from "@/server/tenant";

export async function markNotificationReadAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  await prisma.notification.updateMany({
    where: { id, tenantId: ctx.tenant.id, userId: ctx.session.user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const ctx = await requireTenantContext();
  await prisma.notification.updateMany({
    where: { tenantId: ctx.tenant.id, userId: ctx.session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
