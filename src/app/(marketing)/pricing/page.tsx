import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = { title: "Pricing" };

const PLANS = [
  { name: "Free Trial", price: "₹0", period: "/14 days", users: "3 users", leads: "200 leads", features: ["All channels", "Pipeline & follow-ups", "Email support"] },
  { name: "Starter", price: "₹1,499", period: "/mo", users: "5 users", leads: "2,000 leads", features: ["Everything in trial", "CSV import/export", "Campaigns"] },
  { name: "Growth", price: "₹4,999", period: "/mo", users: "15 users", leads: "10,000 leads", featured: true, features: ["Everything in Starter", "Automation engine", "API access", "Advanced reports"] },
  { name: "Business", price: "₹12,999", period: "/mo", users: "50 users", leads: "50,000 leads", features: ["Everything in Growth", "AI assistant", "Priority support"] },
  { name: "Enterprise", price: "Custom", period: "", users: "500+ users", leads: "500,000+ leads", features: ["Dedicated infrastructure", "SSO", "Custom SLA"] },
];

export default function PricingPage() {
  return (
    <Section className="pt-16">
      <SectionHeading eyebrow="Pricing" title="Plans that grow with your team" description="Every plan includes tenant isolation, RBAC, audit logs and our full core CRM. Upgrade or downgrade any time." center />
      <div className="mt-14 grid gap-6 md:grid-cols-3 lg:grid-cols-5">
        {PLANS.map((p) => (
          <Card key={p.name} className={`flex flex-col p-6 ${p.featured ? "border-brand ring-2 ring-brand/30" : ""}`}>
            <p className="font-semibold">{p.name}</p>
            <p className="mt-2 text-2xl font-bold">
              {p.price}
              <span className="text-sm font-normal text-muted">{p.period}</span>
            </p>
            <p className="mt-1 text-xs text-muted">{p.users} · {p.leads}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
            <LinkButton href="/signup" className="mt-6 w-full justify-center" variant={p.featured ? "primary" : "secondary"}>
              {p.name === "Enterprise" ? "Contact Sales" : "Start Free Trial"}
            </LinkButton>
          </Card>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-muted">
        Usage limits (leads, users, messages, storage, API calls) are enforced server-side and shown live in
        Settings → Billing. Plan limits are never hard-coded in the UI.
      </p>
    </Section>
  );
}
