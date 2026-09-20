import Link from "next/link";
import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireTenantContext();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [leads, customers] = query
    ? await withTenantContext(ctx.tenant.id, async (tx) => {
        const leads = await tx.lead.findMany({
          where: {
            tenantId: ctx.tenant.id,
            deletedAt: null,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { mobile: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { company: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 20,
        });
        const customers = await tx.customer.findMany({
          where: {
            tenantId: ctx.tenant.id,
            deletedAt: null,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { mobile: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { company: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 20,
        });
        return [leads, customers] as const;
      })
    : [[], []];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Search results for &ldquo;{query}&rdquo;</h1>
      <p className="mt-1 text-sm text-muted">Results are scoped to {ctx.tenant.companyName}.</p>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-muted">Leads ({leads.length})</h2>
        <div className="mt-2 space-y-2">
          {leads.map((l) => (
            <Link key={l.id} href={`/leads/${l.id}`}>
              <Card className="flex items-center justify-between p-4 hover:border-brand">
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-xs text-muted">{l.mobile} · {l.email}</p>
                </div>
                <StatusBadge status={l.status} />
              </Card>
            </Link>
          ))}
          {query && leads.length === 0 && <p className="text-sm text-muted">No matching leads.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-muted">Customers ({customers.length})</h2>
        <div className="mt-2 space-y-2">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card className="flex items-center justify-between p-4 hover:border-brand">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{c.mobile} · {c.email}</p>
                </div>
              </Card>
            </Link>
          ))}
          {query && customers.length === 0 && <p className="text-sm text-muted">No matching customers.</p>}
        </div>
      </div>
    </div>
  );
}
