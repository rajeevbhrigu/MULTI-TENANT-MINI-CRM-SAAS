"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { hashToken } from "@/lib/crypto";
import { hashPassword } from "@/server/auth/password";
import { createSession, getSession, setActiveTenant } from "@/server/auth/session";
import { recordAudit } from "@/server/audit";
import type { ActionState } from "@/server/actions/auth";

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return { error: "This invitation is invalid or has expired." };
  }

  let user = await prisma.user.findUnique({ where: { email: invitation.email } });

  if (!user) {
    if (!fullName || password.length < 8) {
      return { fieldErrors: { password: "Enter your name and a password of at least 8 characters." } };
    }
    user = await prisma.user.create({
      data: {
        fullName,
        email: invitation.email,
        passwordHash: await hashPassword(password),
        emailVerifiedAt: new Date(),
      },
    });
  }

  const existingMembership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: invitation.tenantId, userId: user.id } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${invitation.tenantId}, true)`;
    if (!existingMembership) {
      await tx.tenantUser.create({
        data: { tenantId: invitation.tenantId, userId: user!.id, role: invitation.role, status: "ACTIVE" },
      });
    } else if (existingMembership.status !== "ACTIVE") {
      await tx.tenantUser.update({ where: { id: existingMembership.id }, data: { status: "ACTIVE" } });
    }
    await tx.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
  });

  await recordAudit({
    tenantId: invitation.tenantId,
    actorUserId: user.id,
    action: "user.invite_accepted",
    entityType: "TenantUser",
  });

  await createSession(user.id);
  const session = await getSession();
  if (session) await setActiveTenant(session.sessionId, invitation.tenantId);

  redirect("/dashboard");
}
