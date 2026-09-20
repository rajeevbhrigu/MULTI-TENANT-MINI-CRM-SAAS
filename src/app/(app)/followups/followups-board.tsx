"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/ui/badge";
import { completeFollowupAction, cancelFollowupAction } from "@/server/actions/followups";

export type FollowupRow = {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  lead: { id: string; name: string };
  assignedTo: { fullName: string };
};

export function FollowupsBoard({
  overdue, today, tomorrow, upcoming,
}: {
  overdue: FollowupRow[]; today: FollowupRow[]; tomorrow: FollowupRow[]; upcoming: FollowupRow[];
}) {
  const groups = [
    { title: "Overdue", items: overdue, tone: "border-danger" },
    { title: "Today", items: today, tone: "border-warning" },
    { title: "Tomorrow", items: tomorrow, tone: "border-info" },
    { title: "Upcoming", items: upcoming, tone: "border-border" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {groups.map((g) => (
        <Card key={g.title} className={`border-t-4 ${g.tone}`}>
          <CardHeader><CardTitle>{g.title} ({g.items.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-3">
            {g.items.map((f) => <FollowupCard key={f.id} f={f} />)}
            {g.items.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted">Nothing here.</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FollowupCard({ f }: { f: FollowupRow }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${f.lead.id}`} className="font-medium hover:text-brand">{f.title}</Link>
        <PriorityBadge priority={f.priority} />
      </div>
      <p className="mt-1 text-xs text-muted">{f.lead.name} · {f.assignedTo.fullName}</p>
      <p className="text-xs text-muted">{format(new Date(f.dueDate), "PP p")}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(async () => { await completeFollowupAction(f.id); router.refresh(); })}>Complete</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await cancelFollowupAction(f.id); router.refresh(); })}>Cancel</Button>
      </div>
    </div>
  );
}
