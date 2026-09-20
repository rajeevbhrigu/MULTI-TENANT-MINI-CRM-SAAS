"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Phone, MessageCircle, Mail, StickyNote, CalendarPlus, ArrowRightLeft, UserCog } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Input, Label } from "@/components/ui/field";
import { StatusBadge, PriorityBadge, Badge } from "@/components/ui/badge";
import {
  changeLeadStatusAction, assignLeadAction, addNoteAction, addActivityAction,
} from "@/server/actions/leads";
import { createFollowupAction, completeFollowupAction, cancelFollowupAction } from "@/server/actions/followups";
import { convertLeadToCustomerAction } from "@/server/actions/customers";
import { generateLeadSummaryAction, saveAiSummaryAsNoteAction } from "@/server/actions/ai";
import { Sparkles } from "lucide-react";
import type { LeadStatusValue } from "@prisma/client";
import { cn } from "@/lib/cn";

const STATUSES: LeadStatusValue[] = ["NEW", "QUALIFIED", "HOT", "FOLLOW_UP", "HOLD", "SALE", "LOST", "INVALID"];
const TABS = ["Overview", "Conversation", "Activities", "Notes", "Follow-ups", "Files", "History"] as const;

type Member = { id: string; fullName: string };

export function LeadProfile({
  lead,
  members,
  customers,
}: {
  lead: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  members: Member[];
  customers: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [pending, startTransition] = useTransition();
  const [showConvert, setShowConvert] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{lead.name}</h1>
              <StatusBadge status={lead.status} />
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="mt-1 text-sm text-muted">
              LEAD-{String(lead.leadNumber).padStart(6, "0")} · {lead.company ?? "No company"} · {lead.source}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.mobile && (
              <a href={`tel:${lead.mobile}`}>
                <Button variant="secondary" size="sm"><Phone className="h-4 w-4" /> Call</Button>
              </a>
            )}
            {lead.mobile && (
              <a href={`https://wa.me/${lead.mobile.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`}>
                <Button variant="secondary" size="sm"><Mail className="h-4 w-4" /> Email</Button>
              </a>
            )}
            <Button variant="secondary" size="sm" onClick={() => setTab("Notes")}><StickyNote className="h-4 w-4" /> Note</Button>
            <Button variant="secondary" size="sm" onClick={() => setTab("Follow-ups")}><CalendarPlus className="h-4 w-4" /> Follow-up</Button>
            {lead.status !== "CUSTOMER" && (
              <Button size="sm" onClick={() => setShowConvert(true)}><ArrowRightLeft className="h-4 w-4" /> Convert</Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Status</p>
            <Select
              className="mt-1 h-8 text-xs"
              defaultValue={lead.status}
              disabled={pending}
              onChange={(e) => startTransition(async () => { await changeLeadStatusAction(lead.id, e.target.value as LeadStatusValue); router.refresh(); })}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted">Assigned To</p>
            <Select
              className="mt-1 h-8 text-xs"
              defaultValue={lead.assignedToId ?? ""}
              disabled={pending}
              onChange={(e) => startTransition(async () => { await assignLeadAction(lead.id, e.target.value || null); router.refresh(); })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted">Phone</p>
            <p className="mt-1.5 text-sm font-medium">{lead.mobile ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Email</p>
            <p className="mt-1.5 truncate text-sm font-medium">{lead.email ?? "—"}</p>
          </div>
        </div>
      </Card>

      {showConvert && (
        <ConvertModal leadId={lead.id} customers={customers} onClose={() => setShowConvert(false)} />
      )}

      <Card className="p-0">
        <div className="flex overflow-x-auto border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 text-sm font-medium",
                tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "Overview" && <OverviewTab lead={lead} />}
          {tab === "Conversation" && <ConversationTab conversations={lead.conversations} />}
          {tab === "Activities" && <ActivitiesTab activities={lead.activities} leadId={lead.id} />}
          {tab === "Notes" && <NotesTab notes={lead.notes} leadId={lead.id} />}
          {tab === "Follow-ups" && <FollowupsTab followups={lead.followups} leadId={lead.id} members={members} />}
          {tab === "Files" && <FilesTab files={lead.files} />}
          {tab === "History" && <HistoryTab history={lead.statusHistory} />}
        </div>
      </Card>
    </div>
  );
}

function OverviewTab({ lead }: { lead: any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [summary, setSummary] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {[
          ["Location", lead.location ?? "—"],
          ["Campaign", lead.campaign?.name ?? "—"],
          ["Created By", lead.createdBy?.fullName ?? "—"],
          ["Created", format(new Date(lead.createdAt), "PPp")],
          ["Last Activity", lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt), { addSuffix: true }) : "—"],
          ["Next Follow-up", lead.nextFollowupAt ? format(new Date(lead.nextFollowupAt), "PPp") : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 font-medium">{value}</dd>
          </div>
        ))}
        <div className="col-span-full">
          <dt className="text-xs text-muted">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {lead.tags?.length ? lead.tags.map((t: any) => <Badge key={t.tagId}>{t.tag.name}</Badge>) : <span className="text-muted">No tags</span>} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
          </dd>
        </div>
      </dl>

      <div className="rounded-md border border-border bg-muted-surface p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-brand" /> AI Summary</p>
          <Button
            size="sm" variant="secondary" disabled={pending}
            onClick={() => startTransition(async () => {
              const res = await generateLeadSummaryAction(lead.id);
              if ("summary" in res) { setSummary(res.summary); setSaved(false); }
            })}
          >
            {pending ? "Generating…" : summary ? "Regenerate" : "Generate Summary"}
          </Button>
        </div>
        {summary && (
          <div className="mt-3">
            <Badge tone="brand">AI-generated</Badge>
            <p className="mt-2 text-sm">{summary}</p>
            {!saved ? (
              <Button size="sm" className="mt-3" disabled={pending} onClick={() => startTransition(async () => { await saveAiSummaryAsNoteAction(lead.id, summary); setSaved(true); })}>
                Approve &amp; save as note
              </Button>
            ) : (
              <p className="mt-2 text-xs text-success">Saved as an internal note.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationTab({ conversations }: { conversations: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!conversations?.length) {
    return <p className="text-sm text-muted">No conversations yet. Connect WhatsApp, Facebook, Instagram or Gmail from Integrations to start capturing messages here.</p>;
  }
  return (
    <div className="space-y-6">
      {conversations.map((c) => (
        <div key={c.id}>
          <p className="mb-2 text-xs font-semibold uppercase text-muted">{c.channel}</p>
          <div className="space-y-2">
            {c.messages.map((m: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div key={m.id} className={cn("max-w-md rounded-lg px-3 py-2 text-sm", m.direction === "OUTBOUND" ? "ml-auto bg-brand text-white" : "bg-muted-surface")}>
                <p>{m.content}</p>
                <p className={cn("mt-1 text-[10px]", m.direction === "OUTBOUND" ? "text-white/70" : "text-muted")}>
                  {m.createdAt ? format(new Date(m.createdAt), "p") : ""} · {m.providerStatus}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivitiesTab({ activities, leadId }: { activities: any[]; leadId: string }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div>
      <form
        action={(fd) => startTransition(async () => { await addActivityAction(fd); router.refresh(); })}
        className="mb-5 flex flex-wrap items-end gap-2 border-b border-border pb-5"
      >
        <input type="hidden" name="leadId" value={leadId} />
        <div>
          <Label htmlFor="act-type">Type</Label>
          <Select id="act-type" name="type" className="w-36">
            {["CALL", "EMAIL", "MEETING", "DEMO", "OTHER"].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="act-subject">Subject</Label>
          <Input id="act-subject" name="subject" placeholder="What happened?" />
        </div>
        <Button type="submit" size="sm" disabled={pending}>Log Activity</Button>
      </form>
      <ol className="space-y-4">
        {activities.map((a: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
          <li key={a.id} className="flex gap-3 text-sm">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
            <div>
              <p className="font-medium">{a.subject ?? a.type.replace("_", " ")}</p>
              {a.description && <p className="text-muted">{a.description}</p>}
              <p className="text-xs text-muted">{a.user?.fullName ?? "System"} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
            </div>
          </li>
        ))}
        {activities.length === 0 && <p className="text-sm text-muted">No activity recorded yet.</p>}
      </ol>
    </div>
  );
}

function NotesTab({ notes, leadId }: { notes: any[]; leadId: string }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <div className="mb-5 border-b border-border pb-5">
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Add an internal note (never shown to the customer)…" rows={3} />
        <Button
          size="sm"
          className="mt-2"
          disabled={pending || !content.trim()}
          onClick={() => startTransition(async () => { await addNoteAction(leadId, content); setContent(""); router.refresh(); })}
        >
          Add Note
        </Button>
      </div>
      <div className="space-y-3">
        {notes.map((n: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
          <div key={n.id} className="rounded-md border border-border bg-muted-surface p-3">
            <div className="flex items-center gap-2">
              <Badge tone="warning">Internal</Badge>
              <span className="text-xs text-muted">{n.user.fullName} · {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
            </div>
            <p className="mt-2 text-sm">{n.content}</p>
          </div>
        ))}
        {notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
      </div>
    </div>
  );
}

function FollowupsTab({ followups, leadId, members }: { followups: any[]; leadId: string; members: Member[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <form
        action={(fd) => startTransition(async () => { await createFollowupAction(fd); router.refresh(); })}
        className="mb-5 grid gap-2 border-b border-border pb-5 sm:grid-cols-2"
      >
        <input type="hidden" name="leadId" value={leadId} />
        <Input name="title" placeholder="Follow-up title" required />
        <Input name="dueDate" type="datetime-local" required />
        <Select name="priority" defaultValue="MEDIUM">
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select name="assignedToId" defaultValue="">
          <option value="">Assign to me</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
        </Select>
        <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2">Schedule Follow-up</Button>
      </form>
      <div className="space-y-2">
        {followups.map((f: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
          <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">{f.title}</p>
              <p className="text-xs text-muted">{format(new Date(f.dueDate), "PPp")} · {f.assignedTo.fullName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={f.status === "COMPLETED" ? "success" : f.status === "CANCELLED" ? "neutral" : "warning"}>{f.status}</Badge>
              {f.status === "PENDING" && (
                <>
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(async () => { await completeFollowupAction(f.id); router.refresh(); })}>Complete</Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await cancelFollowupAction(f.id); router.refresh(); })}>Cancel</Button>
                </>
              )}
            </div>
          </div>
        ))}
        {followups.length === 0 && <p className="text-sm text-muted">No follow-ups scheduled.</p>}
      </div>
    </div>
  );
}

function FilesTab({ files }: { files: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <div>
      {files.length === 0 && <p className="text-sm text-muted">No files attached yet.</p>}
      <div className="space-y-2">
        {files.map((f: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
          <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <span>{f.fileName}</span>
            <span className="text-xs text-muted">{(f.fileSizeBytes / 1024).toFixed(0)} KB</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ history }: { history: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <ol className="space-y-3">
      {history.map((h: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
        <li key={h.id} className="flex items-center gap-3 text-sm">
          <UserCog className="h-4 w-4 text-muted" />
          <span>{h.oldStatus ? `${h.oldStatus} → ${h.newStatus}` : `Created as ${h.newStatus}`}</span>
          <span className="ml-auto text-xs text-muted">{formatDistanceToNow(new Date(h.changedAt), { addSuffix: true })}</span>
        </li>
      ))}
      {history.length === 0 && <p className="text-sm text-muted">No history yet.</p>}
    </ol>
  );
}

function ConvertModal({ leadId, customers, onClose }: { leadId: string; customers: { id: string; name: string }[]; onClose: () => void }) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold">Convert to Customer</h2>
        <form action={convertLeadToCustomerAction} className="mt-4 space-y-4">
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="mode" value={mode} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("new")} className={cn("flex-1 rounded-md border p-3 text-sm", mode === "new" ? "border-brand bg-brand-soft text-brand" : "border-border")}>
              Create New Customer
            </button>
            <button type="button" onClick={() => setMode("existing")} className={cn("flex-1 rounded-md border p-3 text-sm", mode === "existing" ? "border-brand bg-brand-soft text-brand" : "border-border")}>
              Link Existing Customer
            </button>
          </div>
          {mode === "existing" && (
            <Select name="existingCustomerId" required>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Convert</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
