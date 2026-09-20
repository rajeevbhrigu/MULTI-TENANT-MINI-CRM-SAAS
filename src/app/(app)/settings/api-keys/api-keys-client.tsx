"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createApiKeyAction, revokeApiKeyAction } from "@/server/actions/api-keys";
import { format } from "date-fns";

export type ApiKeyRow = { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

export function ApiKeysClient({ keys }: { keys: ApiKeyRow[] }) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Create API Key</CardTitle></CardHeader>
        <CardContent>
          <form
            action={(fd) => startTransition(async () => {
              const res = await createApiKeyAction(fd);
              if ("key" in res) setNewKey(res.key);
              router.refresh();
            })}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Label htmlFor="name">Key name</Label>
              <Input id="name" name="name" placeholder="e.g. Zapier integration" required />
            </div>
            <Button type="submit" disabled={pending}>Generate Key</Button>
          </form>
          {newKey && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm">
              <p className="font-medium text-warning">Copy this key now — it won&apos;t be shown again.</p>
              <code className="mt-2 block break-all rounded bg-surface p-2 text-xs">{newKey}</code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader><CardTitle>Active Keys</CardTitle></CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-5 py-3">Name</th><th className="px-2 py-3">Key</th><th className="px-2 py-3">Created</th>
              <th className="px-2 py-3">Last Used</th><th className="px-2 py-3">Status</th><th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">{k.name}</td>
                <td className="px-2 py-3 font-mono text-xs">{k.keyPrefix}…</td>
                <td className="px-2 py-3 text-xs text-muted">{format(new Date(k.createdAt), "PP")}</td>
                <td className="px-2 py-3 text-xs text-muted">{k.lastUsedAt ? format(new Date(k.lastUsedAt), "PP") : "Never"}</td>
                <td className="px-2 py-3">{k.revokedAt ? <Badge tone="neutral">Revoked</Badge> : <Badge tone="success">Active</Badge>}</td>
                <td className="px-2 py-3 text-right">
                  {!k.revokedAt && (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await revokeApiKeyAction(k.id); router.refresh(); })}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">No API keys yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
