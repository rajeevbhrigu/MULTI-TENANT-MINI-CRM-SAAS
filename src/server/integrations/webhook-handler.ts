import "server-only";
import { prisma } from "@/server/db/client";
import { getAdapter } from "@/server/integrations/registry";
import { applyInboundEvent } from "@/server/integrations/lead-intake";
import { decryptSecret } from "@/lib/crypto";
import type { IntegrationProvider } from "@prisma/client";
import type { NormalizedInboundEvent } from "@/server/integrations/types";

export type WebhookProcessResult = {
  signatureValid: boolean;
  processed: number;
  skippedDuplicates: number;
  errors: string[];
};

function eventId(event: NormalizedInboundEvent): string {
  return event.kind === "message" ? event.externalMessageId : event.externalLeadId;
}

/**
 * Shared inbound-webhook pipeline used by every provider route:
 * 1. Verify the signature against the connected tenant's stored secret
 *    (falls back to the shared dev secret for connections still in MOCK
 *    mode, so the flow can be exercised without real credentials).
 * 2. Parse the raw payload into normalized events.
 * 3. Persist each event as a WebhookEvent row keyed by (provider,
 *    providerEventId) for idempotency - a re-delivered webhook is a no-op.
 * 4. Apply each new event to the CRM (lead-intake). Failures are recorded
 *    on the WebhookEvent row rather than dropped, so they can be retried.
 */
export async function processInboundWebhook(
  provider: IntegrationProvider,
  rawBody: string,
  signatureHeader: string | null,
): Promise<WebhookProcessResult> {
  const adapter = getAdapter(provider);
  const payload = JSON.parse(rawBody);
  const events = adapter.parseWebhookEvents(payload);

  const result: WebhookProcessResult = { signatureValid: false, processed: 0, skippedDuplicates: 0, errors: [] };
  if (events.length === 0) {
    result.signatureValid = true; // nothing to validate against a specific tenant secret
    return result;
  }

  // All events in a single delivery share one externalAccountId in practice.
  const externalAccountId = events[0].externalAccountId;
  const connection = await prisma.integrationConnection.findFirst({
    where: { provider, externalAccountId },
  });

  const devSecret = process.env[`${provider}_WEBHOOK_VERIFY_TOKEN`] ?? "dev-webhook-secret";
  const secret = connection?.encryptedCredentials ? decryptSecret(connection.encryptedCredentials) : devSecret;
  const signatureValid = adapter.verifySignature(rawBody, signatureHeader, secret);
  result.signatureValid = signatureValid;

  if (!signatureValid) {
    // Persist for audit/debugging without applying it to any tenant's data.
    await prisma.webhookEvent.create({
      data: { provider, providerEventId: `invalid-sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, signatureValid: false, payload },
    }).catch(() => undefined);
    return result;
  }

  if (!connection) {
    result.errors.push(`No integration connection found for ${provider} account ${externalAccountId}`);
    return result;
  }

  for (const event of events) {
    const providerEventId = eventId(event);
    try {
      await prisma.webhookEvent.create({
        data: { tenantId: connection.tenantId, provider, providerEventId, signatureValid: true, payload: event as unknown as object },
      });
    } catch {
      // Unique constraint violation = already processed this exact event.
      result.skippedDuplicates++;
      continue;
    }

    try {
      await applyInboundEvent(connection.tenantId, provider, event);
      await prisma.webhookEvent.update({ where: { provider_providerEventId: { provider, providerEventId } }, data: { processedAt: new Date() } });
      result.processed++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      await prisma.webhookEvent.update({ where: { provider_providerEventId: { provider, providerEventId } }, data: { processingError: message } });
      result.errors.push(message);
    }
  }

  return result;
}
