"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, getSession, setActiveTenant } from "@/server/auth/session";
import { recordAudit } from "@/server/audit";
import { generateToken, hashToken } from "@/lib/crypto";
import { slugify, randomSuffix } from "@/lib/slug";
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { DEFAULT_PIPELINE_STAGES, DEFAULT_PLANS, DEFAULT_TRIAL_PLAN_CODE } from "@/server/defaults";
import { getEmailProvider } from "@/server/email/provider";
import { checkRateLimit } from "@/server/rate-limit";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

async function ensureDefaultPlan() {
  let plan = await prisma.plan.findUnique({ where: { code: DEFAULT_TRIAL_PLAN_CODE } });
  if (!plan) {
    for (const p of DEFAULT_PLANS) {
      await prisma.plan.upsert({ where: { code: p.code }, update: {}, create: p });
    }
    plan = await prisma.plan.findUnique({ where: { code: DEFAULT_TRIAL_PLAN_CODE } });
  }
  return plan!;
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    mobile: String(formData.get("mobile") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  const rl = await checkRateLimit(`signup:${raw.email}`, 5, 60 * 60);
  if (!rl.allowed) return { error: "Too many signup attempts. Please try again later." };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { fieldErrors: { email: "An account with this email already exists." } };

  const plan = await ensureDefaultPlan();
  const passwordHash = await hashPassword(parsed.data.password);
  const baseSlug = slugify(parsed.data.companyName);

  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.tenant.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${baseSlug}-${randomSuffix(4)}`;
  }

  const now = new Date();
  const trialEnds = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

  const { user, tenant } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        passwordHash,
        mobile: parsed.data.mobile,
      },
    });

    const tenant = await tx.tenant.create({
      data: { companyName: parsed.data.companyName, slug },
    });

    // Everything below is tenant-owned; RLS requires app.tenant_id to match.
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

    await tx.tenantUser.create({
      data: { tenantId: tenant.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
    });

    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "TRIAL",
        trialEndsAt: trialEnds,
        currentPeriodEnd: trialEnds,
        provider: "mock",
      },
    });

    await tx.leadCounter.create({ data: { tenantId: tenant.id, value: 0 } });

    const pipeline = await tx.pipeline.create({
      data: { tenantId: tenant.id, name: "Sales Pipeline", type: "SALES", isDefault: true },
    });

    for (let i = 0; i < DEFAULT_PIPELINE_STAGES.length; i++) {
      const s = DEFAULT_PIPELINE_STAGES[i];
      await tx.pipelineStage.create({
        data: {
          tenantId: tenant.id,
          pipelineId: pipeline.id,
          name: s.name,
          status: s.status,
          color: s.color,
          sortOrder: i,
        },
      });
    }

    return { user, tenant };
  });

  await recordAudit({
    tenantId: tenant.id,
    actorUserId: user.id,
    action: "user.signup",
    entityType: "Tenant",
    entityId: tenant.id,
    newValues: { companyName: tenant.companyName, ownerEmail: user.email },
  });

  await createSession(user.id);
  const session = await getSession();
  if (session) await setActiveTenant(session.sessionId, tenant.id);

  // Email verification (non-blocking for the redirect below).
  const verifyToken = generateToken(24);
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(verifyToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await getEmailProvider().send({
    to: user.email,
    subject: "Verify your MiniCRM account",
    html: `<p>Welcome to MiniCRM. Verify your email:</p><p><a href="${process.env.APP_URL}/api/auth/verify-email?token=${verifyToken}">Verify email</a></p>`,
    text: `Verify your email: ${process.env.APP_URL}/api/auth/verify-email?token=${verifyToken}`,
  });

  redirect("/onboarding");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  const rl = await checkRateLimit(`login:${raw.email}`, 10, 15 * 60);
  if (!rl.allowed) return { error: "Too many login attempts. Please try again in a few minutes." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const genericError = { error: "Invalid email or password." };
  if (!user || user.deletedAt) return genericError;

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordAudit({ tenantId: null, actorUserId: user.id, action: "auth.login_failed", entityType: "User", entityId: user.id });
    return genericError;
  }

  const membership = await prisma.tenantUser.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    return { error: "Your account is not active in any workspace. Contact your administrator." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  const session = await getSession();
  if (session) await setActiveTenant(session.sessionId, membership.tenantId);

  await recordAudit({ tenantId: membership.tenantId, actorUserId: user.id, action: "auth.login", entityType: "User", entityId: user.id });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    await recordAudit({ tenantId: session.activeTenantId, actorUserId: session.user.id, action: "auth.logout", entityType: "User", entityId: session.user.id });
  }
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = { email: String(formData.get("email") ?? "").toLowerCase().trim() };
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { error: "Enter a valid email address." };

  const rl = await checkRateLimit(`forgot:${raw.email}`, 5, 60 * 60);
  if (!rl.allowed) return { error: "Too many requests. Please try again later." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Always behave the same whether or not the account exists (no enumeration).
  if (user) {
    const token = generateToken(24);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await getEmailProvider().send({
      to: user.email,
      subject: "Reset your MiniCRM password",
      html: `<p>Reset your password:</p><p><a href="${process.env.APP_URL}/reset-password?token=${token}">Reset password</a></p><p>This link expires in 1 hour.</p>`,
      text: `Reset your password: ${process.env.APP_URL}/reset-password?token=${token}`,
    });
  }
  return { error: undefined };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  await recordAudit({ tenantId: null, actorUserId: record.userId, action: "auth.password_reset", entityType: "User", entityId: record.userId });

  redirect("/login?reset=success");
}
