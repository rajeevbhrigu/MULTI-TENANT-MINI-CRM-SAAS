import type { ChannelAdapter, NormalizedInboundEvent, SendMessageRequest, SendMessageResult } from "@/server/integrations/types";

/**
 * Gmail adapter. Real Gmail push notifications arrive via Google Cloud
 * Pub/Sub as a JWT-signed POST containing only { emailAddress, historyId } -
 * the actual message content is fetched afterwards via the Gmail API
 * (users.history.list / users.messages.get) using stored OAuth credentials.
 * That follow-up fetch is not implemented without real Gmail OAuth
 * credentials; this adapter accepts an already-expanded payload shape
 * (as documented in docs/API.md) so the webhook -> lead-intake pipeline can
 * be exercised end-to-end in mock mode.
 */
export class GmailAdapter implements ChannelAdapter {
  readonly provider = "GMAIL" as const;
  readonly defaultLeadSource = "GMAIL" as const;

  verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    // Real Gmail Pub/Sub push verification checks a bearer JWT (in the
    // Authorization header) against Google's public keys, not an HMAC body
    // signature. The mock/dev path compares a shared verification token so
    // the endpoint cannot be hit by unauthenticated third parties.
    return signatureHeader === secret;
  }

  parseWebhookEvents(payload: unknown): NormalizedInboundEvent[] {
    const body = payload as {
      mailbox?: string;
      messageId?: string;
      threadId?: string;
      from?: string;
      fromName?: string;
      subject?: string;
      snippet?: string;
      receivedAt?: string;
    };
    if (!body.mailbox || !body.messageId || !body.from) return [];

    return [
      {
        kind: "message",
        externalAccountId: body.mailbox,
        externalConversationId: body.threadId ?? body.messageId,
        externalMessageId: body.messageId,
        contactName: body.fromName,
        contactHandle: body.from,
        contactEmail: body.from,
        content: [body.subject, body.snippet].filter(Boolean).join(" — "),
        sentAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      },
    ];
  }

  async sendMessage(req: SendMessageRequest, credentials: Record<string, string>): Promise<SendMessageResult> {
    if (!credentials.refreshToken) {
      return { success: true, externalMessageId: `mock_gmail_${Date.now()}` };
    }
    return { success: false, error: "Live Gmail sending is not configured." };
  }
}
