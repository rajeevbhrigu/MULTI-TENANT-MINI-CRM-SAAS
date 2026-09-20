import type { Metadata } from "next";
import {
  Inbox, Kanban, Bell, BarChart3, Users, Plug, Tags, FileSpreadsheet,
  ClipboardList, MessageSquare, Layers, Webhook,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = { title: "Features" };

const GROUPS = [
  {
    title: "Lead Capture & Inbox",
    icon: Inbox,
    items: [
      "Unified inbox for WhatsApp, Facebook, Instagram, Gmail and manual leads",
      "Server-side search, filters and sorting across 25+ leads per page",
      "Bulk assign, tag, status change, export and archive",
      "Duplicate detection on mobile, email and name + company",
    ],
  },
  {
    title: "Pipeline & Sales Process",
    icon: Kanban,
    items: [
      "Drag-and-drop Kanban pipeline with custom stages",
      "Multiple pipelines: sales, support, renewal, custom",
      "Full stage-change history, never overwritten",
      "Deal values per stage per lead",
    ],
  },
  {
    title: "Follow-ups & Activities",
    icon: Bell,
    items: [
      "Overdue, today, tomorrow and upcoming follow-up views",
      "Append-only activity timeline: calls, messages, notes, meetings",
      "Internal notes clearly marked and never sent to customers",
    ],
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    items: [
      "Tenant-specific dashboard with date-range filters",
      "Lead, source, campaign, sales, team and conversion reports",
      "CSV export scoped to your workspace, with audit trail",
    ],
  },
  {
    title: "Team & Permissions",
    icon: Users,
    items: [
      "Owner, Admin, Manager, Sales Agent and Viewer roles",
      "Granular permissions enforced server-side, not just hidden buttons",
      "Invite, deactivate, reactivate and reassign leads",
    ],
  },
  {
    title: "Integrations",
    icon: Plug,
    items: [
      "WhatsApp Business API-ready adapter",
      "Facebook & Instagram Lead Ads with signature-verified webhooks",
      "Gmail thread matching without duplicate lead creation",
      "Provider-agnostic — swap adapters without touching core CRM logic",
    ],
  },
  { title: "Tags & Custom Fields", icon: Tags, items: ["Tenant-specific tags", "Custom fields for leads, customers and deals without schema changes"] },
  { title: "Import & Export", icon: FileSpreadsheet, items: ["CSV import with column mapping, preview and duplicate detection", "Filtered CSV export, always tenant-scoped"] },
  { title: "Campaigns", icon: ClipboardList, items: ["Attribution from lead to campaign, permanently retained after conversion"] },
  { title: "Conversations", icon: MessageSquare, items: ["Unified conversation + message model across every channel"] },
  { title: "Multi-tenant Architecture", icon: Layers, items: ["Complete data isolation with PostgreSQL Row Level Security", "Usage limits enforced server-side per plan"] },
  { title: "API & Webhooks", icon: Webhook, items: ["Versioned REST API with API keys", "Signed, idempotent outbound webhooks"] },
];

export default function FeaturesPage() {
  return (
    <Section className="pt-16">
      <SectionHeading eyebrow="Features" title="Everything you need to run sales" description="A complete, production-grade CRM feature set — built to scale from your first lead to millions." />
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <Card key={g.title} className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <g.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{g.title}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              {g.items.map((i) => (
                <li key={i}>• {i}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Section>
  );
}
