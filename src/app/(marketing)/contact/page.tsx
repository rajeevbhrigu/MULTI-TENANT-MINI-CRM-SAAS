import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Card } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Section className="pt-16">
      <SectionHeading eyebrow="Contact" title="Talk to our team" description="Questions about plans, security or migrating from a spreadsheet? We're happy to help." />
      <Card className="mt-10 max-w-lg p-6">
        <ContactForm />
      </Card>
    </Section>
  );
}
