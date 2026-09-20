"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { formatDistanceToNow } from "date-fns";
import { bulkAssignAction, bulkStatusAction, bulkArchiveAction } from "@/server/actions/leads";
import type { LeadStatusValue } from "@prisma/client";

export type LeadRow = {
  id: string;
  leadNumber: number;
  name: string;
  mobile: string | null;
  email: string | null;
  source: string;
  status: LeadStatusValue;
  priority: string;
  assignedTo: { id: string; fullName: string } | null;
  campaign: { name: string } | null;
  nextFollowupAt: string | null;
  createdAt: string;
};

export function LeadsTable({ leads, members }: { leads: LeadRow[]; members: { id: string; fullName: string }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }
  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const ids = [...selected];

  return (
    <div>
      {ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-brand-soft/40 px-4 py-2 text-sm">
          <span className="font-medium">{ids.length} selected</span>
          <Select
            className="h-8 w-40 text-xs"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              startTransition(async () => {
                await bulkAssignAction(ids, e.target.value);
                router.refresh();
              });
            }}
          >
            <option value="">Assign to…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </Select>
          <Select
            className="h-8 w-40 text-xs"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              startTransition(async () => {
                await bulkStatusAction(ids, e.target.value as LeadStatusValue);
                router.refresh();
              });
            }}
          >
            <option value="">Change status…</option>
            {["NEW", "QUALIFIED", "HOT", "FOLLOW_UP", "HOLD", "SALE", "LOST", "INVALID"].map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await bulkArchiveAction(ids);
                setSelected(new Set());
                router.refresh();
              })
            }
          >
            Archive
          </Button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th className="px-2 py-3">Lead</th>
              <th className="px-2 py-3">Contact</th>
              <th className="px-2 py-3">Source</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Priority</th>
              <th className="px-2 py-3">Assigned</th>
              <th className="px-2 py-3">Next Follow-up</th>
              <th className="px-2 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted-surface">
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                </td>
                <td className="px-2 py-3">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:text-brand">
                    {l.name}
                  </Link>
                  <p className="text-xs text-muted">LEAD-{String(l.leadNumber).padStart(6, "0")}</p>
                </td>
                <td className="px-2 py-3 text-xs text-muted">{l.mobile ?? l.email ?? "—"}</td>
                <td className="px-2 py-3 text-xs">{l.source}</td>
                <td className="px-2 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-2 py-3"><PriorityBadge priority={l.priority} /></td>
                <td className="px-2 py-3 text-xs">{l.assignedTo?.fullName ?? "Unassigned"}</td>
                <td className="px-2 py-3 text-xs">{l.nextFollowupAt ? formatDistanceToNow(new Date(l.nextFollowupAt), { addSuffix: true }) : "—"}</td>
                <td className="px-2 py-3 text-xs text-muted">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted">No leads match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border lg:hidden">
        {leads.map((l) => (
          <Link key={l.id} href={`/leads/${l.id}`} className="block px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{l.name}</p>
              <StatusBadge status={l.status} />
            </div>
            <p className="mt-1 text-xs text-muted">{l.mobile ?? l.email ?? "—"} · {l.source}</p>
            <div className="mt-2 flex items-center justify-between">
              <PriorityBadge priority={l.priority} />
              <span className="text-xs text-muted">{l.assignedTo?.fullName ?? "Unassigned"}</span>
            </div>
          </Link>
        ))}
        {leads.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted">No leads match your filters.</p>}
      </div>
    </div>
  );
}
