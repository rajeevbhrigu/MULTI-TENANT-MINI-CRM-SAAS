import Link from "next/link";

const TABS = [
  { href: "/settings", label: "Workspace" },
  { href: "/settings/billing", label: "Billing & Usage" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/automation", label: "Automation" },
  { href: "/settings/audit-log", label: "Audit Log" },
  { href: "/settings/privacy", label: "Privacy" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Manage your workspace configuration.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="shrink-0 px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
