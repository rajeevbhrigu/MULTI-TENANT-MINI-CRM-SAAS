import type { Metadata } from "next";
import { Lock, Database, ShieldCheck, KeyRound, FileClock, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = { title: "Security" };

const PRACTICES = [
  { icon: Database, title: "Tenant isolation", desc: "Every tenant-owned record carries a tenantId resolved server-side from your authenticated session — never trusted from the browser — and is enforced again in PostgreSQL Row Level Security." },
  { icon: ShieldCheck, title: "Role-based access control", desc: "Owner, Admin, Manager, Sales Agent and Viewer roles map to granular permissions checked on the server for every read and write." },
  { icon: Lock, title: "Secure authentication", desc: "Passwords are hashed with bcrypt, sessions are httpOnly/secure cookies backed by server-side revocable session records." },
  { icon: KeyRound, title: "Encrypted secrets", desc: "Integration credentials (WhatsApp, Meta, Gmail) are encrypted at rest with AES-256-GCM and are never sent to the browser." },
  { icon: FileClock, title: "Audit trail", desc: "Every sensitive action — logins, lead changes, role changes, exports, integration changes — is recorded in an append-only audit log." },
  { icon: EyeOff, title: "Least-privilege data access", desc: "Platform-admin support access is explicit, time-boxed and logged; it is never silent impersonation." },
];

export default function SecurityPage() {
  return (
    <Section className="pt-16">
      <SectionHeading eyebrow="Security" title="Security is not an afterthought" description="MiniCRM is designed for multi-tenant SaaS from the ground up." />
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PRACTICES.map((p) => (
          <Card key={p.title} className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <p.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-muted">{p.desc}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-10 p-6 text-sm text-muted">
        Found a security issue? Email <a href="mailto:security@minicrm.example" className="text-brand underline">security@minicrm.example</a> — we take all reports seriously.
      </Card>
    </Section>
  );
}
