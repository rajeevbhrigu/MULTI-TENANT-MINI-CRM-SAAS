"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { getSession, setActiveTenant } from "@/server/auth/session";

export async function switchTenantAction(tenantId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new Error("You are not an active member of that workspace.");
  }

  await setActiveTenant(session.sessionId, tenantId);
  redirect("/dashboard");
}
