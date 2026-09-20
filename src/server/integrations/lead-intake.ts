import "server-only";
import { withTenantContext } from "@/server/db/tenant-context";
import { assertWithinLeadLimit, UsageLimitError } from "@/server/usage";
import type { NormalizedInboundEvent } from "@/server/integrations/types";
import type { ActivityChannel, ConversationChannel, IntegrationProvider, LeadSource } from "@prisma/client";

const PROVIDER_CHANNEL: Record<IntegrationProvider, ConversationChannel> = {
  WHATSAPP: "WHATSAPP",
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  GMAIL: "GMAIL",
};

const PROVIDER_ACTIVITY_CHANNEL: Record<IntegrationProvider, ActivityChannel> = {
  WHATSAPP: "WHATSAPP",
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  GMAIL: "GMAIL",
};

const PROVIDER_SOURCE: Record<IntegrationProvider, LeadSource> = {
  WHATSAPP: "WHATSAPP",
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  GMAIL: "GMAIL",
};

function isEmail(handle: string) {
  return handle.includes("@");
}

/**
 * Applies one normalized inbound event to the CRM: matches or creates a
 * lead, matches or creates the conversation/message, and records an
 * activity + notification. Called from each provider's webhook route after
 * signature verification and idempotency de-duplication.
 *
 * Never creates a new lead per inbound message - it matches on the existing
 * conversation first, then on mobile/email, before creating a new lead.
 */
export async function applyInboundEvent(
  tenantId: string,
  provider: IntegrationProvider,
  event: NormalizedInboundEvent,
): Promise<{ leadId: string }> {
  return withTenantContext(tenantId, async (tx) => {
    const channel = PROVIDER_CHANNEL[provider];
    const source = PROVIDER_SOURCE[provider];

    if (event.kind === "message") {
      let conversation = await tx.conversation.findUnique({
        where: { tenantId_channel_externalConversationId: { tenantId, channel, externalConversationId: event.externalConversationId } },
      });

      let leadId = conversation?.leadId ?? null;

      if (!leadId) {
        const existingLead = await tx.lead.findFirst({
          where: {
            tenantId,
            deletedAt: null,
            OR: [
              ...(isEmail(event.contactHandle) ? [{ email: event.contactHandle }] : [{ mobile: event.contactHandle }]),
            ],
          },
        });

        if (existingLead) {
          leadId = existingLead.id;
        } else {
          try {
            await assertWithinLeadLimit(tenantId);
          } catch (e) {
            // Never silently drop the message: the caller persists the raw
            // WebhookEvent with this error so it can be retried once the
            // plan is upgraded, instead of discarding the lead.
            throw e instanceof UsageLimitError ? e : new Error("Unable to create lead from inbound message");
          }

          const counter = await tx.leadCounter.update({ where: { tenantId }, data: { value: { increment: 1 } } });
          const lead = await tx.lead.create({
            data: {
              tenantId,
              leadNumber: counter.value,
              name: event.contactName ?? event.contactHandle,
              mobile: isEmail(event.contactHandle) ? null : event.contactHandle,
              email: isEmail(event.contactHandle) ? event.contactHandle : event.contactEmail ?? null,
              source,
              status: "NEW",
            },
          });
          await tx.leadStatusHistory.create({ data: { tenantId, leadId: lead.id, newStatus: "NEW", reason: `Inbound ${provider} message` } });
          leadId = lead.id;
        }
      }

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: { tenantId, leadId, channel, externalConversationId: event.externalConversationId, lastMessageAt: event.sentAt },
        });
      } else {
        await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: event.sentAt } });
      }

      await tx.message.upsert({
        where: { tenantId_externalMessageId: { tenantId, externalMessageId: event.externalMessageId } },
        update: {},
        create: {
          tenantId,
          conversationId: conversation.id,
          externalMessageId: event.externalMessageId,
          direction: "INBOUND",
          sender: event.contactHandle,
          messageType: "TEXT",
          content: event.content,
          providerStatus: "DELIVERED",
          receivedAt: event.sentAt,
        },
      });

      await tx.lead.update({ where: { id: leadId }, data: { lastActivityAt: new Date() } });
      await tx.activity.create({
        data: { tenantId, leadId, type: provider === "GMAIL" ? "EMAIL" : provider === "WHATSAPP" ? "WHATSAPP" : "OTHER", channel: PROVIDER_ACTIVITY_CHANNEL[provider], subject: `Message received via ${provider}`, description: event.content.slice(0, 200) },
      });

      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (lead?.assignedToId) {
        await tx.notification.create({
          data: { tenantId, userId: lead.assignedToId, type: "MESSAGE_RECEIVED", title: `New ${provider} message`, body: event.content.slice(0, 140), relatedEntityType: "Lead", relatedEntityId: leadId },
        });
      }

      return { leadId };
    }

    // Lead-generation event (e.g. Facebook Lead Ads)
    const existingLead = await tx.lead.findFirst({
      where: { tenantId, deletedAt: null, OR: [...(event.phone ? [{ mobile: event.phone }] : []), ...(event.email ? [{ email: event.email }] : [])] },
    });
    if (existingLead) return { leadId: existingLead.id };

    await assertWithinLeadLimit(tenantId);

    let campaignId: string | null = null;
    if (event.campaignId || event.formId) {
      const campaign = await tx.campaign.findFirst({ where: { tenantId, campaignIdExternal: event.campaignId ?? event.formId } });
      campaignId = campaign?.id ?? null;
    }

    const counter = await tx.leadCounter.update({ where: { tenantId }, data: { value: { increment: 1 } } });
    const lead = await tx.lead.create({
      data: {
        tenantId, leadNumber: counter.value, name: event.name,
        mobile: event.phone ?? null, email: event.email ?? null,
        source, campaignId, adReference: event.adId ?? null, status: "NEW",
      },
    });
    await tx.leadStatusHistory.create({ data: { tenantId, leadId: lead.id, newStatus: "NEW", reason: `Inbound ${provider} lead ad` } });
    await tx.activity.create({ data: { tenantId, leadId: lead.id, type: "LEAD_CREATED", channel: PROVIDER_ACTIVITY_CHANNEL[provider], subject: `Lead captured via ${provider} ads` } });

    return { leadId: lead.id };
  });
}
