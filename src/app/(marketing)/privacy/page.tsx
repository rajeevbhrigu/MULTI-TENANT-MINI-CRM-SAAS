import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <Section className="pt-16">
      <SectionHeading eyebrow="Legal" title="Privacy Policy" description="Last updated September 2026" />
      <div className="prose prose-slate mt-10 max-w-3xl space-y-6 text-sm text-muted">
        <p>
          This Privacy Policy explains how MiniCRM collects, uses and protects data submitted to your workspace
          and about your use of the Service.
        </p>
        <h3 className="font-semibold text-foreground">Data we collect</h3>
        <p>
          Account data (name, email, mobile), workspace data (leads, customers, conversations, activities) that
          you or your integrations submit, and usage data for security and product improvement.
        </p>
        <h3 className="font-semibold text-foreground">Tenant isolation</h3>
        <p>
          Data submitted to your workspace is isolated from every other workspace at both the application and
          database level and is never used to train models for other customers.
        </p>
        <h3 className="font-semibold text-foreground">Data export and deletion</h3>
        <p>
          You can export your data as CSV at any time. Workspace owners can request full account deletion from
          Settings → Privacy, which requires typing the company name to confirm and is logged in the audit trail.
        </p>
        <h3 className="font-semibold text-foreground">Sub-processors</h3>
        <p>
          We use infrastructure providers for hosting, storage, email delivery and (when connected) messaging
          and AI providers you explicitly enable in Integrations.
        </p>
        <p>This is placeholder legal content for demonstration purposes and is not legal advice.</p>
      </div>
    </Section>
  );
}
