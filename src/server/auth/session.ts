import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/server/db/client";
import { generateToken, hashToken } from "@/lib/crypto";

export const SESSION_COOKIE = "minicrm_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<void> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const hdrs = await headers();

  await prisma.session.create({
    data: {
      sessionToken: tokenHash,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: hdrs.get("user-agent") ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export type AuthedSession = {
  sessionId: string;
  activeTenantId: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    isPlatformAdmin: boolean;
  };
};

/** Reads + validates the session cookie against the DB. Returns null if absent/expired/revoked. */
export async function getSession(): Promise<AuthedSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
    return null;
  }

  return {
    sessionId: session.id,
    activeTenantId: session.activeTenantId,
    user: {
      id: session.user.id,
      fullName: session.user.fullName,
      email: session.user.email,
      avatarUrl: session.user.avatarUrl,
      isPlatformAdmin: session.user.isPlatformAdmin,
    },
  };
}

export async function setActiveTenant(sessionId: string, tenantId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { activeTenantId: tenantId },
  });
}
