"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Share2, Camera, Mail, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectIntegrationAction, disconnectIntegrationAction, simulateInboundMessageAction } from "@/server/actions/integrations";
import type { IntegrationProvider } from "@prisma/client";

const PROVIDERS: { key: IntegrationProvider; label: string; icon: typeof MessageCircle; desc: string }[] = [
  { key: "WHATSAPP", label: "WhatsApp Business", icon: MessageCircle, desc: "Capture leads and reply via WhatsApp Business API." },
  { key: "FACEBOOK", label: "Facebook Lead Ads", icon: Share2, desc: "Auto-capture leads from Facebook Lead Ads and Messenger." },
  { key: "INSTAGRAM", label: "Instagram", icon: Camera, desc: "Capture Instagram DMs as leads and conversations." },
  { key: "GMAIL", label: "Gmail", icon: Mail, desc: "Match inbound email threads to leads and customers." },
];

export type ConnectionRow = { provider: IntegrationProvider; status: string; mode: string; externalAccountId: string | null };

export function IntegrationsClient({ connections, canManage }: { connections: ConnectionRow[]; canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDERS.map((p) => {
        const conn = connections.find((c) => c.provider === p.key);
        const connected = conn?.status === "CONNECTED";
        return (
          <Card key={p.key}>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><p.icon className="h-5 w-5" /></span>
                <div>
                  <CardTitle>{p.label}</CardTitle>
                  <p className="text-xs text-muted">{p.desc}</p>
                </div>
              </div>
              <Badge tone={connected ? "success" : "neutral"}>{connected ? "Connected" : "Not Connected"}</Badge>
            </CardHeader>
            <CardContent>
              {connected && (
                <div className="mb-3 space-y-1 text-xs text-muted">
                  <p>Mode: <span className="font-medium text-foreground">{conn?.mode}</span> {conn?.mode === "MOCK" && "— safe test mode, no real messages sent"}</p>
                  <p>Account ID: <code>{conn?.externalAccountId}</code></p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {canManage && !connected && (
                  <Button size="sm" disabled={pending} onClick={() => startTransition(async () => { await connectIntegrationAction(p.key); router.refresh(); })}>
                    Connect (Mock Mode)
                  </Button>
                )}
                {canManage && connected && (
                  <>
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(async () => { await simulateInboundMessageAction(p.key); router.refresh(); })}>
                      <Zap className="h-4 w-4" /> Simulate Inbound
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await disconnectIntegrationAction(p.key); router.refresh(); })}>
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
