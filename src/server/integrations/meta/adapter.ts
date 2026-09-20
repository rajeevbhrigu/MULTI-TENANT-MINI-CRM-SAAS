import type { ChannelAdapter, NormalizedInboundEvent, SendMessageRequest, SendMessageResult } from "@/server/integrations/types";
import { verifyHmacSha256 } from "@/server/integrations/hmac";

/**
 * Facebook Lead Ads + Page Messenger adapter. Handles two webhook shapes:
 * leadgen events (entry[].changes[].value = { leadgen_id, form_id, page_id, ad_id, ... })
 * and messaging events (entry[].messaging[]).
 */
export class MetaAdapter implements ChannelAdapter {
  readonly provider = "FACEBOOK" as const;
  readonly defaultLeadSource = "FACEBOOK" as const;

  verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    return verifyHmacSha256(rawBody, signatureHeader, secret);
  }

  parseWebhookEvents(payload: unknown): NormalizedInboundEvent[] {
    const events: NormalizedInboundEvent[] = [];
    const entries = (payload as { entry?: unknown[] })?.entry ?? [];

    for (const entry of entries as Record<string, unknown>[]) {
      const pageId = entry.id as string;

      for (const change of (entry.changes as Record<string, unknown>[]) ?? []) {
        if (change.field !== "leadgen") continue;
        const value = change.value as Record<string, unknown>;
        events.push({
          kind: "lead",
          externalAccountId: pageId,
          externalLeadId: value.leadgen_id as string,
          name: (value.full_name as string) ?? "Facebook Lead",
          phone: value.phone_number as string | undefined,
          email: value.email as string | undefined,
          formId: value.form_id as string | undefined,
          adId: value.ad_id as string | undefined,
          campaignId: value.campaign_id as string | undefined,
          createdAt: new Date(Number(value.created_time ?? Date.now() / 1000) * 1000),
        });
      }

      for (const m of (entry.messaging as Record<string, unknown>[]) ?? []) {
        const sender = (m.sender as Record<string, unknown> | undefined)?.id as string | undefined;
        const message = m.message as Record<string, unknown> | undefined;
        if (!sender || !message) continue;
        events.push({
          kind: "message",
          externalAccountId: pageId,
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
    if (!credentials.pageAccessToken) {
      return { success: true, externalMessageId: `mock_fb_${Date.now()}` };
    }
    return { success: false, error: "Live Facebook sending is not configured." };
  }
}
