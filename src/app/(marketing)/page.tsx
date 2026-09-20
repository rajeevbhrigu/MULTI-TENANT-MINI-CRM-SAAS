import Link from "next/link";
import {
  Inbox, Kanban, Bell, BarChart3, Users, Plug, ShieldCheck,
  MessageCircle, Share2, Camera, Mail, ArrowRight, Check,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Section, SectionHeading, Eyebrow } from "@/components/marketing/section";

const CHANNELS = [
  { icon: MessageCircle, label: "WhatsApp", color: "text-green-600 bg-green-50" },
  { icon: Share2, label: "Facebook", color: "text-blue-600 bg-blue-50" },
  { icon: Camera, label: "Instagram", color: "text-pink-600 bg-pink-50" },
  { icon: Mail, label: "Gmail", color: "text-red-600 bg-red-50" },
];

const FEATURES = [
  { icon: Inbox, title: "Central Lead Inbox", desc: "Every lead from every channel lands in one searchable, filterable inbox." },
  { icon: Kanban, title: "Visual Pipeline", desc: "Drag leads through customizable stages with full stage-change history." },
  { icon: Bell, title: "Follow-up Reminders", desc: "Never miss a follow-up with overdue, today and upcoming views." },
  { icon: BarChart3, title: "Real-time Analytics", desc: "Conversion funnels, source performance and team leaderboards." },
  { icon: Users, title: "Team Management", desc: "Role-based access with Owner, Admin, Manager, Sales Agent and Viewer roles." },
  { icon: Plug, title: "Integration Ready", desc: "WhatsApp, Meta, Gmail, payments and AI adapters built for growth." },
];

const PLANS = [
  { name: "Starter", price: "₹1,499", period: "/mo", features: ["5 users", "2,000 leads", "WhatsApp + Meta + Gmail", "Email support"] },
  { name: "Growth", price: "₹4,999", period: "/mo", featured: true, features: ["15 users", "10,000 leads", "Automation", "API access", "Priority support"] },
  { name: "Business", price: "₹12,999", period: "/mo", features: ["50 users", "50,000 leads", "AI assistant", "Advanced reports", "Dedicated support"] },
];

const FAQS = [
  { q: "Is my tenant's data isolated from other companies?", a: "Yes. Every record is scoped to your workspace and enforced both in application code and PostgreSQL Row Level Security." },
  { q: "Can I connect WhatsApp, Facebook and Gmail today?", a: "The integration framework, webhooks and conversation model are production-ready. Connect real credentials any time from Settings → Integrations." },
  { q: "Can I invite my team?", a: "Yes, with granular roles: Owner, Admin, Manager, Sales Agent and Viewer, each with configurable permissions." },
  { q: "Can I export my data?", a: "Yes, CSV export is available for leads, customers, campaigns and reports, always scoped to your workspace." },
];

export default function HomePage() {
  return (
    <>
      <Section className="pt-24 pb-16 text-center">
        <Eyebrow>Multi-tenant CRM for growing teams</Eyebrow>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          One place for every lead.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Capture, organize, follow up and convert leads from WhatsApp, Facebook, Instagram and Gmail.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <LinkButton href="/signup" size="lg">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </LinkButton>
          <LinkButton href="/features" size="lg" variant="secondary">
            View Features
          </LinkButton>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl flex-wrap items-center justify-center gap-6">
          {CHANNELS.map((c) => (
            <div key={c.label} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${c.color}`}>
              <c.icon className="h-4 w-4" /> {c.label}
            </div>
          ))}
        </div>
      </Section>

      <Section className="py-16">
        <SectionHeading
          eyebrow="Everything in one CRM"
          title="Built for the full lead lifecycle"
          description="From first message to repeat business, MiniCRM keeps every interaction in one timeline."
          center
        />
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="py-16" id="inbox">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Omnichannel Inbox</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Every conversation, one inbox</h2>
            <p className="mt-4 text-muted">
              WhatsApp, Facebook, Instagram, Gmail and manual leads all flow into a single unified inbox with
              search, filters, sorting and bulk actions — no more switching tabs.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Server-side search across name, mobile, email, company", "Filter by source, status, priority, assignee, campaign", "Bulk assign, tag, change status or export"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-4">
            <div className="space-y-2">
              {[
                { name: "Andrew Peterson", status: "In Process", color: "bg-warning-soft text-warning" },
                { name: "Brooklyn Simmons", status: "Dead", color: "bg-info-soft text-info" },
                { name: "Leslie Alexander", status: "Recycled", color: "bg-brand-soft text-brand" },
              ].map((l) => (
                <div key={l.name} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-muted">Today 10:30 AM</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${l.color}`}>{l.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      <Section className="py-16" id="pipeline">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Card className="order-2 p-4 lg:order-1">
            <div className="grid grid-cols-3 gap-3 text-xs">
              {["New", "Follow-up", "Sale"].map((s) => (
                <div key={s} className="rounded-md bg-muted-surface p-3">
                  <p className="font-semibold">{s}</p>
                  <p className="mt-1 text-muted">4 leads</p>
                  <div className="mt-3 h-16 rounded bg-surface shadow-sm" />
                </div>
              ))}
            </div>
          </Card>
          <div className="order-1 lg:order-2">
            <Eyebrow>Sales Pipeline</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Drag leads through your funnel</h2>
            <p className="mt-4 text-muted">
              A visual Kanban pipeline with fully customizable stages, deal values and complete stage-change
              history. Run multiple pipelines for sales, support or renewals.
            </p>
          </div>
        </div>
      </Section>

      <Section className="py-16" id="analytics">
        <SectionHeading eyebrow="Analytics" title="Know exactly what's working" center description="Track leads by source, status and campaign with a tenant-specific dashboard that updates in real time." />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Leads", value: "1,248" },
            { label: "Conversion Rate", value: "18.7%" },
            { label: "Open Deals", value: "86" },
            { label: "Revenue (MTD)", value: "₹4,82,900" },
          ].map((s) => (
            <Card key={s.label} className="p-5 text-center">
              <p className="text-2xl font-bold text-brand">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="py-16" id="team">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Team Management</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Right access for every role</h2>
            <p className="mt-4 text-muted">
              Invite unlimited team members with Owner, Admin, Manager, Sales Agent and Viewer roles — each with
              granular, auditable permissions enforced on the server.
            </p>
          </div>
          <div id="integrations">
            <Eyebrow>Integrations</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Ready for WhatsApp, Meta &amp; Gmail</h2>
            <p className="mt-4 text-muted">
              A provider-agnostic integration layer with adapters for WhatsApp Business API, Facebook &amp;
              Instagram, and Gmail — connect real credentials whenever you're ready.
            </p>
          </div>
        </div>
      </Section>

      <Section className="py-16" id="security">
        <Card className="flex flex-col items-center gap-6 p-10 text-center">
          <ShieldCheck className="h-10 w-10 text-brand" />
          <SectionHeading center title="Security you can trust" description="Tenant isolation enforced at the application layer and in PostgreSQL Row Level Security, RBAC on every action, full audit trails, and encrypted secrets." />
          <LinkButton href="/security" variant="secondary">Read our security practices</LinkButton>
        </Card>
      </Section>

      <Section className="py-16" id="pricing">
        <SectionHeading eyebrow="Pricing" title="Simple, transparent pricing" description="Start free for 14 days. No credit card required." center />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PLANS.map((p) => (
            <Card key={p.name} className={`p-6 ${p.featured ? "border-brand ring-2 ring-brand/30" : ""}`}>
              <p className="font-semibold">{p.name}</p>
              <p className="mt-2 text-3xl font-bold">{p.price}<span className="text-base font-normal text-muted">{p.period}</span></p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <LinkButton href="/signup" className="mt-6 w-full justify-center" variant={p.featured ? "primary" : "secondary"}>
                Start Free Trial
              </LinkButton>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          See the full <Link href="/pricing" className="text-brand underline">pricing page</Link> for details.
        </p>
      </Section>

      <Section className="py-16" id="faq">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" center />
        <div className="mx-auto mt-12 max-w-2xl space-y-4">
          {FAQS.map((f) => (
            <Card key={f.q} className="p-5">
              <p className="font-semibold">{f.q}</p>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="py-20 text-center">
        <Card className="mx-auto max-w-3xl bg-brand p-12 text-white">
          <h2 className="text-3xl font-bold">Ready to organize every lead?</h2>
          <p className="mt-4 text-white/80">Start your 14-day free trial. No credit card required.</p>
          <LinkButton href="/signup" size="lg" className="mt-8 bg-white text-brand hover:bg-white/90">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </Card>
      </Section>
    </>
  );
}
