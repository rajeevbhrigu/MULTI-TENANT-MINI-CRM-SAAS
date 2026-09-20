import type { IntegrationProvider } from "@prisma/client";
import type { ChannelAdapter } from "@/server/integrations/types";
import { WhatsAppAdapter } from "@/server/integrations/whatsapp/adapter";
import { MetaAdapter } from "@/server/integrations/meta/adapter";
import { InstagramAdapter } from "@/server/integrations/instagram/adapter";
import { GmailAdapter } from "@/server/integrations/gmail/adapter";

const ADAPTERS: Record<IntegrationProvider, ChannelAdapter> = {
  WHATSAPP: new WhatsAppAdapter(),
  FACEBOOK: new MetaAdapter(),
  INSTAGRAM: new InstagramAdapter(),
  GMAIL: new GmailAdapter(),
};

export function getAdapter(provider: IntegrationProvider): ChannelAdapter {
  return ADAPTERS[provider];
}
