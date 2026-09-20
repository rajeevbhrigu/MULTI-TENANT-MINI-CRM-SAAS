"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateCustomerAction } from "@/server/actions/customers";

export function CustomerDetail({ customer }: { customer: any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
        <CardContent>
          <form
            action={(fd) => startTransition(async () => { await updateCustomerAction(customer.id, fd); router.refresh(); })}
            className="space-y-3"
          >
            <div><Label>Name</Label><Input name="name" defaultValue={customer.name} /></div>
            <div><Label>Mobile</Label><Input name="mobile" defaultValue={customer.mobile ?? ""} /></div>
            <div><Label>Email</Label><Input name="email" defaultValue={customer.email ?? ""} /></div>
            <div><Label>Company</Label><Input name="company" defaultValue={customer.company ?? ""} /></div>
            <div><Label>Address</Label><Input name="address" defaultValue={customer.address ?? ""} /></div>
            <Button type="submit" size="sm" disabled={pending}>Save</Button>
          </form>
          <div className="mt-4 border-t border-border pt-4 text-xs text-muted">
            <p>Customer since {format(new Date(customer.customerSince), "PP")}</p>
            {customer.leadId && <p className="mt-1">Converted from <a href={`/leads/${customer.leadId}`} className="text-brand hover:underline">original lead</a></p>}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Activity History</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {customer.activities.length === 0 && <p className="p-5 text-sm text-muted">No activity yet.</p>}
          {customer.activities.map((a: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
            <div key={a.id} className="px-5 py-3 text-sm">
              <p className="font-medium">{a.subject ?? a.type.replace("_", " ")}</p>
              <p className="text-xs text-muted">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
