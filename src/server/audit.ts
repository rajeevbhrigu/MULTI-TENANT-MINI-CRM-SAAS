import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/server/db/client";

type AuditParams = {
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "secret",
  "encryptedCredentials",
  "keyHash",
]);

function redact(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k) ? "[redacted]" : redact(v);
  }
  return out;
}

/** Records an immutable audit entry. Never include passwords/tokens/secrets - see redact(). */
export async function recordAudit(params: AuditParams): Promise<void> {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  try {
    const hdrs = await headers();
    ipAddress = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    userAgent = hdrs.get("user-agent") ?? null;
  } catch {
    // headers() is unavailable outside a request scope (e.g. background jobs)
  }

  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      oldValues: params.oldValues ? (redact(params.oldValues) as object) : undefined,
      newValues: params.newValues ? (redact(params.newValues) as object) : undefined,
      ipAddress,
      userAgent,
    },
  });
}
