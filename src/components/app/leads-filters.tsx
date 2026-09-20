"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/field";

const STATUSES = ["NEW", "QUALIFIED", "HOT", "FOLLOW_UP", "HOLD", "SALE", "CUSTOMER", "LOST", "INVALID"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const SOURCES = ["WHATSAPP", "FACEBOOK", "INSTAGRAM", "GMAIL", "WEBSITE", "REFERRAL", "MANUAL", "OTHER"];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently Updated" },
  { value: "followup_due", label: "Follow-up Due" },
  { value: "priority", label: "Priority" },
];

export function LeadsFilters({
  members,
}: {
  members: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update("q", q);
        }}
        className="relative min-w-[220px] flex-1"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, email, company" className="pl-9" />
      </form>
      <Select className="w-36" defaultValue={searchParams.get("status") ?? ""} onChange={(e) => update("status", e.target.value)}>
        <option value="">All Status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
      </Select>
      <Select className="w-36" defaultValue={searchParams.get("priority") ?? ""} onChange={(e) => update("priority", e.target.value)}>
        <option value="">All Priority</option>
        {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <Select className="w-36" defaultValue={searchParams.get("source") ?? ""} onChange={(e) => update("source", e.target.value)}>
        <option value="">All Sources</option>
        {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <Select className="w-40" defaultValue={searchParams.get("assignedToId") ?? ""} onChange={(e) => update("assignedToId", e.target.value)}>
        <option value="">All Assignees</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
      </Select>
      <Select className="w-44" defaultValue={searchParams.get("sort") ?? "newest"} onChange={(e) => update("sort", e.target.value)}>
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>
    </div>
  );
}
