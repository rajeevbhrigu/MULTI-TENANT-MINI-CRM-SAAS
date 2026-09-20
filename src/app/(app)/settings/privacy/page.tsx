import { Download } from "lucide-react";
import { requireTenantContext } from "@/server/tenant";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { DeleteWorkspaceForm } from "./delete-workspace-form";

export default async function PrivacySettingsPage() {
  const ctx = await requireTenantContext();

  return (
    <div className="space-y-4">
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Export your data</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Download your leads, customers and campaign data as CSV at any time from their respective pages, or use
            the links below.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href="/api/v1/leads/export" variant="secondary" size="sm"><Download className="h-4 w-4" /> Leads CSV</LinkButton>
            <LinkButton href="/api/v1/reports/export?type=customer" variant="secondary" size="sm"><Download className="h-4 w-4" /> Customers CSV</LinkButton>
          </div>
        </CardContent>
      </Card>

      {ctx.membership.role === "OWNER" && (
        <Card className="max-w-2xl border-danger/30">
          <CardHeader><CardTitle className="text-danger">Danger Zone — Delete Workspace</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              This permanently deactivates {ctx.tenant.companyName} for every member. This action requires owner
              authorization and is logged in the audit trail.
            </p>
            <div className="mt-4">
              <DeleteWorkspaceForm companyName={ctx.tenant.companyName} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
