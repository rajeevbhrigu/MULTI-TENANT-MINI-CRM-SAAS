import type { ChannelAdapter, NormalizedInboundEvent, SendMessageRequest, SendMessageResult } from "@/server/integrations/types";
import { verifyHmacSha256 } from "@/server/integrations/hmac";

/**
 * WhatsApp Business API adapter. Payload shape follows Meta's Cloud API
 * webhook format: entry[].changes[].value.messages[] / .contacts[].
 * In mock mode (IntegrationConnection.mode = "MOCK", the default until real
 * credentials are connected) sendMessage() simulates delivery instead of
 * calling the real Graph API, and is never presented to the user as a live
 * send.
 */
export class WhatsAppAdapter implements ChannelAdapter {
  readonly provider = "WHATSAPP" as const;
  readonly defaultLeadSource = "WHATSAPP" as const;

  verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    return verifyHmacSha256(rawBody, signatureHeader, secret);
  }

  parseWebhookEvents(payload: unknown): NormalizedInboundEvent[] {
    const events: NormalizedInboundEvent[] = [];
    const entries = (payload as { entry?: unknown[] })?.entry ?? [];

    for (const entry of entries as Record<string, unknown>[]) {
      const changes = (entry.changes as Record<string, unknown>[]) ?? [];
      for (const change of changes) {
        const value = change.value as Record<string, unknown> | undefined;
        if (!value) continue;
        const phoneNumberId = (value.metadata as Record<string, unknown> | undefined)?.phone_number_id as string | undefined;
        const contacts = (value.contacts as Record<string, unknown>[]) ?? [];
        const messages = (value.messages as Record<string, unknown>[]) ?? [];

        for (const msg of messages) {
          const from = msg.from as string;
          const contact = contacts.find((c) => (c.wa_id as string) === from);
          events.push({
            kind: "message",
            externalAccountId: phoneNumberId ?? "unknown",
            externalConversationId: from,
            externalMessageId: msg.id as string,
            contactName: (contact?.profile as Record<string, unknown> | undefined)?.name as string | undefined,
            contactHandle: from,
            content: ((msg.text as Record<string, unknown> | undefined)?.body as string) ?? `[${msg.type}]`,
            sentAt: new Date(Number(msg.timestamp) * 1000),
          });
        }
      }
    }
    return events;
  }

  async sendMessage(req: SendMessageRequest, credentials: Record<string, string>): Promise<SendMessageResult> {
    if (!credentials.accessToken) {
      // Mock mode: simulate a successful send without calling any real API.
      return { success: true, externalMessageId: `mock_wa_${Date.now()}` };
    }
    // Live mode would POST to https://graph.facebook.com/v19.0/{phone_number_id}/messages
    // using credentials.accessToken - not implemented without real credentials.
    return { success: false, error: "Live WhatsApp sending is not configured. Connect real credentials in Settings → Integrations." };
  }
}
