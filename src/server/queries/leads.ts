import "server-only";
import type { Prisma, LeadStatusValue, LeadPriority, LeadSource } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";

export type LeadFilters = {
  q?: string;
  status?: LeadStatusValue;
  priority?: LeadPriority;
  source?: LeadSource;
  assignedToId?: string;
  campaignId?: string;
  sort?: "newest" | "oldest" | "updated" | "followup_due" | "priority";
  page?: number;
  pageSize?: number;
};

export async function listLeads(tenantId: string, filters: LeadFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);

  const where: Prisma.LeadWhereInput = {
    tenantId,
    deletedAt: null,
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.source && { source: filters.source }),
    ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
    ...(filters.campaignId && { campaignId: filters.campaignId }),
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { mobile: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { company: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
  };

  const orderBy: Prisma.LeadOrderByWithRelationInput =
    filters.sort === "oldest" ? { createdAt: "asc" } :
    filters.sort === "updated" ? { updatedAt: "desc" } :
    filters.sort === "followup_due" ? { nextFollowupAt: "asc" } :
    filters.sort === "priority" ? { priority: "desc" } :
    { createdAt: "desc" };

  return withTenantContext(tenantId, async (tx) => {
    const [total, leads] = await Promise.all([
      tx.lead.count({ where }),
      tx.lead.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
          campaign: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
        },
      }),
    ]);

    return { leads, total, page, pageSize, pageCount: Math.max(Math.ceil(total / pageSize), 1) };
  });
}

export async function getLeadDetail(tenantId: string, leadId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      include: {
        assignedTo: true,
        createdBy: true,
        campaign: true,
        tags: { include: { tag: true } },
        statusHistory: { orderBy: { changedAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
        notes: { orderBy: { createdAt: "desc" }, include: { user: true } },
        followups: { orderBy: { dueDate: "asc" }, include: { assignedTo: true } },
        conversations: { include: { messages: { orderBy: { createdAt: "asc" } } } },
        customer: true,
        files: true,
      },
    }),
  );
}

export async function findPossibleDuplicates(tenantId: string, mobile?: string | null, email?: string | null) {
  if (!mobile && !email) return [];
  return withTenantContext(tenantId, (tx) =>
    tx.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          ...(mobile ? [{ mobile }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      take: 5,
    }),
  );
}
