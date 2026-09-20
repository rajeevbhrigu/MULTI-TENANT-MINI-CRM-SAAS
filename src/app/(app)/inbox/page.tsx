import Link from "next/link";
import { requireTenantContext } from "@/server/tenant";
import { withTenantContext } from "@/server/db/tenant-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";

export default async function InboxPage() {
  const ctx = await requireTenantContext();

  const conversations = await withTenantContext(ctx.tenant.id, (tx) =>
    tx.conversation.findMany({
      where: { tenantId: ctx.tenant.id },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        lead: true,
        customer: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted">Every WhatsApp, Facebook, Instagram and Gmail conversation in one place.</p>
      </div>

      <Card className="divide-y divide-border p-0">
        {conversations.map((c) => {
          const last = c.messages[0];
          const name = c.lead?.name ?? c.customer?.name ?? "Unknown";
          const href = c.lead ? `/leads/${c.lead.id}` : c.customer ? `/customers/${c.customer.id}` : "#";
          return (
            <Link key={c.id} href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-muted-surface">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{name}</p>
                  {c.lastMessageAt && <span className="shrink-0 text-xs text-muted">{formatDistanceToNow(c.lastMessageAt, { addSuffix: true })}</span>}
                </div>
                <p className="truncate text-sm text-muted">{last?.content ?? "No messages yet"}</p>
              </div>
              <Badge tone="brand">{c.channel}</Badge>
            </Link>
          );
        })}
        {conversations.length === 0 && (
          <div className="p-10 text-center text-sm text-muted">
            No conversations yet. Connect WhatsApp, Facebook, Instagram or Gmail from{" "}
            <Link href="/integrations" className="text-brand hover:underline">Integrations</Link> to start capturing messages here.
          </div>
        )}
      </Card>
    </div>
  );
}
