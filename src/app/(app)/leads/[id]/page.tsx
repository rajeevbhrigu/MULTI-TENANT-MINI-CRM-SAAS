import { notFound } from "next/navigation";
import { requireTenantContext } from "@/server/tenant";
import { getLeadDetail } from "@/server/queries/leads";
import { prisma } from "@/server/db/client";
import { LeadProfile } from "@/components/app/lead-profile";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenantContext();
  const { id } = await params;

  const lead = await getLeadDetail(ctx.tenant.id, id);
  if (!lead) notFound();

  const [members, customers] = await Promise.all([
    prisma.tenantUser.findMany({ where: { tenantId: ctx.tenant.id, status: "ACTIVE" }, include: { user: true } }),
    prisma.customer.findMany({ where: { tenantId: ctx.tenant.id, deletedAt: null }, select: { id: true, name: true }, take: 200 }),
  ]);

  return (
    <LeadProfile
      lead={JSON.parse(JSON.stringify(lead))}
      members={members.map((m) => ({ id: m.user.id, fullName: m.user.fullName }))}
      customers={customers}
    />
  );
}
