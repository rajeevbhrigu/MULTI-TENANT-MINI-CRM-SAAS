import Link from "next/link";
import { Inbox, Kanban, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: Inbox, text: "One inbox for WhatsApp, Facebook, Instagram and Gmail" },
  { icon: Kanban, text: "Visual pipeline with full history" },
  { icon: ShieldCheck, text: "Enterprise-grade tenant isolation" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">M</span>
          MiniCRM
        </Link>
        <div className="mx-auto w-full max-w-sm py-10">{children}</div>
      </div>
      <div className="hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <h2 className="max-w-sm text-3xl font-bold">One place for every lead.</h2>
        <p className="mt-4 max-w-sm text-white/80">
          Capture, organize, follow up and convert leads from WhatsApp, Facebook, Instagram and Gmail.
        </p>
        <ul className="mt-10 space-y-4">
          {POINTS.map((p) => (
            <li key={p.text} className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <p.icon className="h-4 w-4" />
              </span>
              {p.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
