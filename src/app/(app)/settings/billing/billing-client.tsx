"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { changePlanAction, cancelSubscriptionAction } from "@/server/actions/billing";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";

export type PlanOption = { id: string; code: string; name: string; price: number; currency: string; maxUsers: number; maxLeads: number };
export type UsageRow = { label: string; used: number; limit: number };

export function BillingClient({
  currentPlanId, status, periodEnd, usage, plans, canManage,
}: {
  currentPlanId: string; status: string; periodEnd: string | null;
  usage: UsageRow[]; plans: PlanOption[]; canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Current Plan</CardTitle>
          <Badge tone={status === "ACTIVE" ? "success" : status === "TRIAL" ? "info" : "danger"}>{status}</Badge>
        </CardHeader>
        <CardContent>
          {periodEnd && <p className="text-sm text-muted">Renews {format(new Date(periodEnd), "PP")}</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {usage.map((u) => (
              <div key={u.label}>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{u.label}</span><span>{u.used} / {u.limit}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted-surface">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min((u.used / Math.max(u.limit, 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          {canManage && status !== "CANCELLED" && (
            <Button variant="secondary" size="sm" className="mt-4" disabled={pending} onClick={() => startTransition(async () => { await cancelSubscriptionAction(); router.refresh(); })}>
              Cancel Subscription
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={`rounded-lg border p-4 ${p.id === currentPlanId ? "border-brand ring-2 ring-brand/30" : "border-border"}`}>
              <p className="font-semibold">{p.name}</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(p.price, p.currency)}<span className="text-xs font-normal text-muted">/mo</span></p>
              <p className="mt-1 text-xs text-muted">{p.maxUsers} users · {p.maxLeads} leads</p>
              {canManage && (
                <Button
                  size="sm" variant={p.id === currentPlanId ? "secondary" : "primary"} className="mt-3 w-full justify-center"
                  disabled={pending || p.id === currentPlanId}
                  onClick={() => startTransition(async () => { await changePlanAction(p.id); router.refresh(); })}
                >
                  {p.id === currentPlanId ? "Current Plan" : "Switch Plan"}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
