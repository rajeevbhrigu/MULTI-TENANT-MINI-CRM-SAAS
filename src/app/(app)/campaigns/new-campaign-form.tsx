"use client";

import { useState } from "react";
import { createCampaignAction } from "@/server/actions/campaigns";
import { Input, Select, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

export function NewCampaignForm() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Campaign</Button>;
  }
  return (
    <Card className="p-4">
      <form action={async (fd) => { await createCampaignAction(fd); setOpen(false); }} className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" name="name" required className="w-48" />
        </div>
        <div>
          <Label htmlFor="c-platform">Platform</Label>
          <Select id="c-platform" name="platform" defaultValue="FACEBOOK" className="w-40">
            {["FACEBOOK", "INSTAGRAM", "GMAIL", "WHATSAPP", "WEBSITE", "OTHER"].map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="c-budget">Budget</Label>
          <Input id="c-budget" name="budget" type="number" className="w-32" />
        </div>
        <Button type="submit" size="sm">Create</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </form>
    </Card>
  );
}
