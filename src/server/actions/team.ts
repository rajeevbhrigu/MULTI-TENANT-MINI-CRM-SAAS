"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import { generateToken, hashToken } from "@/lib/crypto";
import { getEmailProvider } from "@/server/email/provider";
import type { TenantRole } from "@prisma/client";
import type { ActionState } from "@/server/actions/auth";

export async function inviteMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "users.invite");

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const role = String(formData.get("role") ?? "SALES_AGENT") as TenantRole;

  if (!email || !email.includes("@")) return { fieldErrors: { email: "Enter a valid email address." } };
  if (!["ADMIN", "MANAGER", "SALES_AGENT", "VIEWER"].includes(role)) {
    return { error: "Invalid role." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId: ctx.tenant.id, userId: existingUser.id } },
    });
    if (existingMembership) return { error: "This person is already part of your workspace." };
  }

  const token = generateToken(24);
  await withTenantContext(ctx.tenant.id, async (tx) => {
    await tx.invitation.create({
      data: {
        tenantId: ctx.tenant.id,
        email,
        role,
        tokenHash: hashToken(token),
        invitedById: ctx.session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  await recordAudit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.session.user.id,
    action: "user.invited",
    entityType: "Invitation",
    newValues: { email, role },
  });

  await getEmailProvider().send({
    to: email,
    subject: `You've been invited to join ${ctx.tenant.companyName} on MiniCRM`,
    html: `<p>${ctx.session.user.fullName} invited you to join <b>${ctx.tenant.companyName}</b> on MiniCRM as ${role.replace("_", " ")}.</p><p><a href="${process.env.APP_URL}/accept-invite?token=${token}">Accept invitation</a></p>`,
    text: `Accept your invitation: ${process.env.APP_URL}/accept-invite?token=${token}`,
  });

  revalidatePath("/settings/team");
  revalidatePath("/onboarding");
  return { error: undefined };
}

export async function changeRoleAction(membershipId: string, role: TenantRole): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "users.edit");

  const membership = await prisma.tenantUser.findFirst({
    where: { id: membershipId, tenantId: ctx.tenant.id },
  });
  if (!membership) throw new Error("Member not found");
  if (membership.role === "OWNER") throw new Error("The workspace owner's role cannot be changed here.");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.tenantUser.update({ where: { id: membershipId }, data: { role } }),
  );

  await recordAudit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.session.user.id,
    action: "user.role_changed",
    entityType: "TenantUser",
    entityId: membershipId,
    oldValues: { role: membership.role },
    newValues: { role },
  });

  revalidatePath("/settings/team");
}

export async function setMemberStatusAction(membershipId: string, active: boolean): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "users.edit");

  const membership = await prisma.tenantUser.findFirst({
    where: { id: membershipId, tenantId: ctx.tenant.id },
  });
  if (!membership) throw new Error("Member not found");
  if (membership.role === "OWNER") throw new Error("The workspace owner cannot be deactivated.");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.tenantUser.update({
      where: { id: membershipId },
      data: {
        status: active ? "ACTIVE" : "DEACTIVATED",
        deactivatedAt: active ? null : new Date(),
      },
    }),
  );

  if (!active) {
    await prisma.session.deleteMany({ where: { userId: membership.userId } });
  }

  await recordAudit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.session.user.id,
    action: active ? "user.reactivated" : "user.deactivated",
    entityType: "TenantUser",
    entityId: membershipId,
  });

  revalidatePath("/settings/team");
}
