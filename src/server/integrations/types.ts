import type { IntegrationProvider, LeadSource } from "@prisma/client";

/** A single normalized event extracted from a raw provider webhook payload. */
export type NormalizedInboundEvent =
  | {
      kind: "message";
      externalAccountId: string; // e.g. WhatsApp phone_number_id, IG/FB page id, Gmail mailbox
      externalConversationId: string;
      externalMessageId: string;
      contactName?: string;
      contactHandle: string; // phone number or email or platform user id
      contactEmail?: string;
      content: string;
      sentAt: Date;
    }
  | {
      kind: "lead";
      externalAccountId: string;
      externalLeadId: string;
      name: string;
      phone?: string;
      email?: string;
      campaignId?: string;
      campaignName?: string;
      adId?: string;
      adSetId?: string;
      formId?: string;
      createdAt: Date;
    };

export type SendMessageRequest = {
  toHandle: string;
  content: string;
};

export type SendMessageResult =
  | { success: true; externalMessageId: string }
  | { success: false; error: string };

/**
 * Every channel (WhatsApp, Meta/Facebook, Instagram, Gmail) implements this
 * interface. CRM core code (lead intake, conversation UI, webhook routes)
 * only ever depends on this interface, never on a specific provider SDK -
 * new channels plug in without touching core logic.
 */
export interface ChannelAdapter {
  readonly provider: IntegrationProvider;
  readonly defaultLeadSource: LeadSource;

  /** Verifies an inbound webhook's signature. Mock adapters accept a shared dev secret. */
  verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean;

  /** Parses a raw webhook payload into zero or more normalized events. */
  parseWebhookEvents(payload: unknown): NormalizedInboundEvent[];

  /** Sends an outbound message. The mock adapter simulates success without calling any real API. */
  sendMessage(req: SendMessageRequest, credentials: Record<string, string>): Promise<SendMessageResult>;
}
