import Link from "next/link";
import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireTenantContext();
  const { q } = await searchParams;

  const customers = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.customer.findMany({
      where: {
        tenantId: ctx.tenant.id,
        deletedAt: null,
        ...(q && {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }),
      },
      include: { owner: true },
      orderBy: { customerSince: "desc" },
      take: 100,
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-muted">{customers.length} customers in {ctx.tenant.companyName}</p>
        </div>
        <form action="/customers" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search customers…" className="h-9 rounded-md border border-border px-3 text-sm" />
        </form>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-2 py-3">Contact</th>
              <th className="px-2 py-3">Company</th>
              <th className="px-2 py-3">Owner</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Customer Since</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted-surface">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link>
                </td>
                <td className="px-2 py-3 text-xs text-muted">{c.mobile ?? c.email ?? "—"}</td>
                <td className="px-2 py-3 text-xs">{c.company ?? "—"}</td>
                <td className="px-2 py-3 text-xs">{c.owner?.fullName ?? "—"}</td>
                <td className="px-2 py-3"><Badge tone={c.status === "ACTIVE" ? "success" : "neutral"}>{c.status}</Badge></td>
                <td className="px-2 py-3 text-xs text-muted">{format(c.customerSince, "PP")}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                No customers yet. Convert a lead from its profile page to get started.
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
