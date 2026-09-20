import type { ChannelAdapter, NormalizedInboundEvent, SendMessageRequest, SendMessageResult } from "@/server/integrations/types";
import { verifyHmacSha256 } from "@/server/integrations/hmac";

/** Instagram DMs, delivered via the same Meta Graph webhook envelope as Messenger. */
export class InstagramAdapter implements ChannelAdapter {
  readonly provider = "INSTAGRAM" as const;
  readonly defaultLeadSource = "INSTAGRAM" as const;

  verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    return verifyHmacSha256(rawBody, signatureHeader, secret);
  }

  parseWebhookEvents(payload: unknown): NormalizedInboundEvent[] {
    const events: NormalizedInboundEvent[] = [];
    const entries = (payload as { entry?: unknown[] })?.entry ?? [];

    for (const entry of entries as Record<string, unknown>[]) {
      const igAccountId = entry.id as string;
      for (const m of (entry.messaging as Record<string, unknown>[]) ?? []) {
        const sender = (m.sender as Record<string, unknown> | undefined)?.id as string | undefined;
        const message = m.message as Record<string, unknown> | undefined;
        if (!sender || !message) continue;
        events.push({
          kind: "message",
          externalAccountId: igAccountId,
          externalConversationId: sender,
          externalMessageId: message.mid as string,
          contactHandle: sender,
          content: (message.text as string) ?? "[attachment]",
          sentAt: new Date(Number(m.timestamp ?? Date.now())),
        });
      }
    }
    return events;
  }

  async sendMessage(req: SendMessageRequest, credentials: Record<string, string>): Promise<SendMessageResult> {
    if (!credentials.accessToken) {
      return { success: true, externalMessageId: `mock_ig_${Date.now()}` };
    }
    return { success: false, error: "Live Instagram sending is not configured." };
  }
}
