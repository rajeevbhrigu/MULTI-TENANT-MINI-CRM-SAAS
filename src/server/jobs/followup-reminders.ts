import "server-only";
import { prisma } from "@/server/db/client";

/**
 * Background job: scans pending follow-ups and notifies the assignee when
 * one is due today or overdue. Idempotent - it only notifies once per
 * follow-up per day by checking for an existing notification first, so it
 * is safe to run on every scheduler tick (see /api/internal/jobs/followup-reminders).
 *
 * In production this is triggered by a real scheduler/queue (cron, Vercel
 * Cron, a worker process polling a queue) rather than an ad-hoc timer in
 * the web process.
 */
export async function runFollowupReminders(): Promise<{ notified: number; overdue: number }> {
  const now = new Date();
  const dueOrOverdue = await prisma.followup.findMany({
    where: { status: "PENDING", dueDate: { lte: now } },
    include: { lead: true },
  });

  let notified = 0;
  let markedOverdue = 0;

  for (const f of dueOrOverdue) {
    const isOverdue = f.dueDate < now;
    const type = isOverdue ? "FOLLOWUP_OVERDUE" : "FOLLOWUP_DUE";

    const alreadyNotifiedToday = await prisma.notification.findFirst({
      where: {
        tenantId: f.tenantId, userId: f.assignedToId, type, relatedEntityType: "Followup", relatedEntityId: f.id,
        createdAt: { gte: new Date(now.toDateString()) },
      },
    });

    if (!alreadyNotifiedToday) {
      await prisma.notification.create({
        data: {
          tenantId: f.tenantId, userId: f.assignedToId, type,
          title: isOverdue ? `Follow-up overdue: ${f.title}` : `Follow-up due today: ${f.title}`,
          body: f.lead.name, relatedEntityType: "Followup", relatedEntityId: f.id,
        },
      });
      notified++;
    }

    if (isOverdue && f.status === "PENDING") markedOverdue++;
  }

  return { notified, overdue: markedOverdue };
}
