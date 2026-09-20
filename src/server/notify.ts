import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Notifies every Owner/Admin/Manager in the tenant about a new, unassigned-worthy event. */
export async function notifyLeadership(
  tx: Tx,
  tenantId: string,
  params: { title: string; body?: string; relatedEntityType?: string; relatedEntityId?: string },
): Promise<void> {
  const leaders = await tx.tenantUser.findMany({
    where: { tenantId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN", "MANAGER"] } },
    select: { userId: true },
  });

  if (leaders.length === 0) return;

  await tx.notification.createMany({
    data: leaders.map((l) => ({
      tenantId,
      userId: l.userId,
      type: "NEW_LEAD" as const,
      title: params.title,
      body: params.body,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    })),
  });
}
