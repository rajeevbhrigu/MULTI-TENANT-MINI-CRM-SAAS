import "server-only";
import { prisma } from "@/server/db/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { notifyLeadership } from "@/server/notify";
import type { AutomationEvent, LeadPriority } from "@prisma/client";

type EventContext = {
  leadId: string;
  priority?: LeadPriority;
  status?: string;
  source?: string;
};

type Condition = { field: "priority" | "status" | "source"; op: "eq" | "neq"; value: string };
type Action =
  | { type: "assign_round_robin" }
  | { type: "create_followup"; hoursFromNow: number; title?: string }
  | { type: "notify_manager"; title?: string }
  | { type: "set_priority"; priority: LeadPriority };

function evaluateConditions(conditions: unknown, ctx: EventContext): boolean {
  if (!Array.isArray(conditions)) return true;
  return (conditions as Condition[]).every((c) => {
    const actual = ctx[c.field];
    if (c.op === "eq") return actual === c.value;
    if (c.op === "neq") return actual !== c.value;
    return true;
  });
}

/**
 * Event-driven automation engine (Section 58). Reusable triggers/conditions
 * /actions loaded from AutomationRule rows - never hard-coded into
 * individual UI pages. Call sites: LEAD_CREATED and STATUS_CHANGED today;
 * MESSAGE_RECEIVED / CUSTOMER_CONVERTED / PAYMENT_RECEIVED follow the same
 * pattern once those flows call runAutomationsForEvent.
 */
export async function runAutomationsForEvent(tenantId: string, event: AutomationEvent, ctx: EventContext): Promise<void> {
  const rules = await prisma.automationRule.findMany({ where: { tenantId, triggerEvent: event, isActive: true } });
  if (rules.length === 0) return;

  for (const rule of rules) {
    if (!evaluateConditions(rule.conditions, ctx)) {
      await prisma.automationRun.create({ data: { ruleId: rule.id, tenantId, entityType: "Lead", entityId: ctx.leadId, status: "SKIPPED" } });
      continue;
    }

    try {
      const actions = Array.isArray(rule.actions) ? (rule.actions as unknown as Action[]) : [];
      await withTenantContext(tenantId, async (tx) => {
        for (const action of actions) {
          if (action.type === "assign_round_robin") {
            const agents = await tx.tenantUser.findMany({ where: { tenantId, status: "ACTIVE", role: "SALES_AGENT" } });
            if (agents.length === 0) continue;
            const counts = await Promise.all(agents.map((a) => tx.lead.count({ where: { tenantId, assignedToId: a.userId, deletedAt: null, status: { notIn: ["SALE", "CUSTOMER", "LOST", "INVALID"] } } })));
            const min = Math.min(...counts);
            const chosen = agents[counts.indexOf(min)];
            await tx.lead.update({ where: { id: ctx.leadId }, data: { assignedToId: chosen.userId } });
            await tx.notification.create({ data: { tenantId, userId: chosen.userId, type: "LEAD_ASSIGNED", title: "A lead was auto-assigned to you", relatedEntityType: "Lead", relatedEntityId: ctx.leadId } });
          } else if (action.type === "create_followup") {
            const lead = await tx.lead.findUnique({ where: { id: ctx.leadId } });
            if (!lead) continue;
            const assignedToId = lead.assignedToId;
            if (!assignedToId) continue;
            const dueDate = new Date(Date.now() + action.hoursFromNow * 60 * 60 * 1000);
            await tx.followup.create({
              data: { tenantId, leadId: ctx.leadId, assignedToId, createdById: assignedToId, title: action.title ?? "Automated follow-up", dueDate, priority: lead.priority },
            });
            await tx.lead.update({ where: { id: ctx.leadId }, data: { nextFollowupAt: dueDate } });
          } else if (action.type === "notify_manager") {
            await notifyLeadership(tx, tenantId, { title: action.title ?? "Automation triggered", relatedEntityType: "Lead", relatedEntityId: ctx.leadId });
          } else if (action.type === "set_priority") {
            await tx.lead.update({ where: { id: ctx.leadId }, data: { priority: action.priority } });
          }
        }
      });

      await prisma.automationRun.create({ data: { ruleId: rule.id, tenantId, entityType: "Lead", entityId: ctx.leadId, status: "SUCCESS" } });
      await prisma.usageRecord.upsert({
        where: { tenantId_metric_periodStart: { tenantId, metric: "AUTOMATION_RUNS", periodStart: new Date(new Date().toDateString()) } },
        update: { value: { increment: 1 } },
        create: { tenantId, metric: "AUTOMATION_RUNS", periodStart: new Date(new Date().toDateString()), periodEnd: new Date(new Date().toDateString()), value: 1 },
      });
    } catch (e) {
      await prisma.automationRun.create({
        data: { ruleId: rule.id, tenantId, entityType: "Lead", entityId: ctx.leadId, status: "FAILED", detail: { error: e instanceof Error ? e.message : "Unknown error" } },
      });
    }
  }
}
