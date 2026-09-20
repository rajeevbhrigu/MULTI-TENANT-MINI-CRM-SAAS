"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import { generateToken } from "@/lib/crypto";
import { processInboundWebhook } from "@/server/integrations/webhook-handler";
import { verifyHmacSha256 } from "@/server/integrations/hmac";
import { createHmac } from "crypto";
import type { IntegrationProvider } from "@prisma/client";

export async function connectIntegrationAction(provider: IntegrationProvider): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "integrations.manage");

  const externalAccountId = `${provider.toLowerCase()}_${ctx.tenant.slug}_${generateToken(4)}`;

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.integrationConnection.upsert({
      where: { tenantId_provider: { tenantId: ctx.tenant.id, provider } },
      update: { status: "CONNECTED", mode: "MOCK", externalAccountId, connectedById: ctx.session.user.id, connectedAt: new Date() },
      create: { tenantId: ctx.tenant.id, provider, mode: "MOCK", status: "CONNECTED", externalAccountId, connectedById: ctx.session.user.id, connectedAt: new Date() },
    }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "integration.connected", entityType: "IntegrationConnection", newValues: { provider, mode: "MOCK" } });

  revalidatePath("/integrations");
}

export async function disconnectIntegrationAction(provider: IntegrationProvider): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "integrations.manage");

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.integrationConnection.updateMany({
      where: { tenantId: ctx.tenant.id, provider },
      data: { status: "DISCONNECTED" },
    }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "integration.disconnected", entityType: "IntegrationConnection", newValues: { provider } });

  revalidatePath("/integrations");
}

/** Simulates an inbound webhook for a MOCK-mode connection, exercising the real webhook pipeline end-to-end. */
export async function simulateInboundMessageAction(provider: IntegrationProvider): Promise<{ error?: string }> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "integrations.manage");

  const connection = await prisma.integrationConnection.findUnique({
    where: { tenantId_provider: { tenantId: ctx.tenant.id, provider } },
  });
  if (!connection || connection.status !== "CONNECTED") return { error: "Connect this integration first." };

  const suffix = generateToken(3);
  const secret = process.env[`${provider}_WEBHOOK_VERIFY_TOKEN`] ?? "dev-webhook-secret";
  const payload = buildSimulatedPayload(provider, connection.externalAccountId!, suffix);
  const rawBody = JSON.stringify(payload);
  const signature = provider === "GMAIL" ? secret : "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");

  // Sanity-check our own signing matches verification before dispatching.
  if (provider !== "GMAIL" && !verifyHmacSha256(rawBody, signature, secret)) {
    return { error: "Failed to sign simulated payload." };
  }

  await processInboundWebhook(provider, rawBody, signature);

  revalidatePath("/inbox");
  revalidatePath("/leads");
  return {};
}

function buildSimulatedPayload(provider: IntegrationProvider, externalAccountId: string, suffix: string) {
  const now = Math.floor(Date.now() / 1000);
  switch (provider) {
    case "WHATSAPP":
      return {
        entry: [{ changes: [{ value: {
          metadata: { phone_number_id: externalAccountId },
          contacts: [{ wa_id: `9199900${suffix}`, profile: { name: `Test Lead ${suffix}` } }],
          messages: [{ from: `9199900${suffix}`, id: `wamid.${suffix}`, timestamp: String(now), type: "text", text: { body: "Hi, I'm interested in your product!" } }],
        } }] }],
      };
    case "FACEBOOK":
      return {
        entry: [{ id: externalAccountId, messaging: [{
          sender: { id: `fbuser${suffix}` }, timestamp: Date.now(),
          message: { mid: `fbmid.${suffix}`, text: "Hi, saw your ad — is this still available?" },
        }] }],
      };
    case "INSTAGRAM":
      return {
        entry: [{ id: externalAccountId, messaging: [{
          sender: { id: `iguser${suffix}` }, timestamp: Date.now(),
          message: { mid: `igmid.${suffix}`, text: "Love this! How much does it cost?" },
        }] }],
      };
    case "GMAIL":
      return {
        mailbox: externalAccountId, messageId: `gmail.${suffix}`, threadId: `thread.${suffix}`,
        from: `prospect${suffix}@example.com`, fromName: `Prospect ${suffix}`,
        subject: "Inquiry about your services", snippet: "Could you send me a quote?",
        receivedAt: new Date().toISOString(),
      };
  }
}
