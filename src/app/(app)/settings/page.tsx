import { requireTenantContext } from "@/server/tenant";
import { prisma } from "@/server/db/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateWorkspaceSettingsAction } from "@/server/actions/settings";

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

export default async function WorkspaceSettingsPage() {
  const ctx = await requireTenantContext();
  const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenant.id } });
  if (!tenant) return null;

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Workspace Information</CardTitle></CardHeader>
      <CardContent>
        <form action={updateWorkspaceSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" name="companyName" defaultValue={tenant.companyName} required />
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select id="timezone" name="timezone" defaultValue={tenant.timezone}>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" name="currency" defaultValue={tenant.currency}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="email">Contact Email</Label>
            <Input id="email" name="email" type="email" defaultValue={tenant.email ?? ""} />
          </div>
          <div>
            <Label htmlFor="phone">Contact Phone</Label>
            <Input id="phone" name="phone" defaultValue={tenant.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={tenant.country ?? ""} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={tenant.address ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
