import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <Section className="pt-16">
      <SectionHeading eyebrow="Legal" title="Terms of Service" description="Last updated September 2026" />
      <div className="prose prose-slate mt-10 max-w-3xl space-y-6 text-sm text-muted">
        <p>
          These Terms of Service ("Terms") govern access to and use of MiniCRM ("Service"). By creating a
          workspace you agree to these Terms on behalf of yourself and the company you represent.
        </p>
        <h3 className="font-semibold text-foreground">1. Accounts and workspaces</h3>
        <p>
          Each workspace is a separate tenant. You are responsible for the accuracy of information you submit
          and for maintaining the confidentiality of your credentials.
        </p>
        <h3 className="font-semibold text-foreground">2. Acceptable use</h3>
        <p>
          You may not use the Service to send unsolicited messages in violation of applicable law, to store
          data you do not have the right to process, or to attempt to access another tenant's data.
        </p>
        <h3 className="font-semibold text-foreground">3. Subscriptions and billing</h3>
        <p>
          Paid plans renew automatically for the selected billing interval unless cancelled prior to the renewal
          date. Usage limits for your plan are shown in Settings → Billing.
        </p>
        <h3 className="font-semibold text-foreground">4. Data ownership</h3>
        <p>
          You retain ownership of all data you submit to your workspace. You may export or delete your data at
          any time, subject to the account and workspace deletion process described in our Privacy Policy.
        </p>
        <h3 className="font-semibold text-foreground">5. Termination</h3>
        <p>
          We may suspend a workspace for violation of these Terms. You may cancel at any time from Settings →
          Billing.
        </p>
        <p>This is placeholder legal content for demonstration purposes and is not legal advice.</p>
      </div>
    </Section>
  );
}
