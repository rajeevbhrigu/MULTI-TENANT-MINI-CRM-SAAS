import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <Section className="pt-16">
      <SectionHeading eyebrow="About" title="Built for teams who live in their CRM" description="MiniCRM exists because sales teams were losing leads between WhatsApp, Facebook, Instagram and their inbox." />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Card className="p-6"><p className="text-3xl font-bold text-brand">2024</p><p className="mt-1 text-sm text-muted">Founded</p></Card>
        <Card className="p-6"><p className="text-3xl font-bold text-brand">1,000+</p><p className="mt-1 text-sm text-muted">Businesses onboarded</p></Card>
        <Card className="p-6"><p className="text-3xl font-bold text-brand">4</p><p className="mt-1 text-sm text-muted">Native channels supported</p></Card>
      </div>
      <div className="mt-12 max-w-3xl space-y-4 text-muted">
        <p>
          MiniCRM was built for small and mid-size businesses that capture leads across multiple channels but
          manage them in spreadsheets, personal chats and disconnected tools. We built a single workspace where
          every lead, conversation and follow-up lives together — without locking teams into one messaging
          provider.
        </p>
        <p>
          Every workspace is fully isolated multi-tenant infrastructure, so your data never mixes with another
          company's, whether you're a two-person team or an enterprise sales org.
        </p>
      </div>
    </Section>
  );
}
