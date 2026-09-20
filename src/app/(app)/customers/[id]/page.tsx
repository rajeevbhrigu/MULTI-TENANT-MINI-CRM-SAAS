import { notFound } from "next/navigation";
import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { CustomerDetail } from "./customer-detail";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenantContext();
  const { id } = await params;

  const customer = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.customer.findFirst({
      where: { id, tenantId: ctx.tenant.id, deletedAt: null },
      include: { activities: { orderBy: { createdAt: "desc" } } },
    }),
  );
  if (!customer) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{customer.name}</h1>
      <CustomerDetail customer={JSON.parse(JSON.stringify(customer))} />
    </div>
  );
}
