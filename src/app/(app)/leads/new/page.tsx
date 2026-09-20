import { requireTenantContext } from "@/server/tenant";
import { prisma } from "@/server/db/client";
import { LeadForm } from "./lead-form";

export default async function NewLeadPage() {
  const ctx = await requireTenantContext();
  const members = await prisma.tenantUser.findMany({
    where: { tenantId: ctx.tenant.id, status: "ACTIVE" },
    include: { user: true },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">New Lead</h1>
      <LeadForm members={members.map((m) => ({ id: m.user.id, fullName: m.user.fullName }))} />
    </div>
  );
}
