import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac, randomUUID } from "crypto";
import { processInboundWebhook } from "@/server/integrations/webhook-handler";
import { withTenantContext } from "@/server/db/tenant-context";
import { createTestTenant, cleanupTenant, prisma } from "../helpers/db";

// Unique per test run so re-running the suite never collides with
// WebhookEvent rows (a global idempotency ledger, not tenant-scoped) left
// over from a previous run.
const runId = randomUUID().slice(0, 8);

const SECRET = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "dev-webhook-secret";

function sign(body: string) {
  return "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
}

function whatsappPayload(externalAccountId: string, messageId: string) {
  return JSON.stringify({
    entry: [{ changes: [{ value: {
      metadata: { phone_number_id: externalAccountId },
      contacts: [{ wa_id: "9199900001", profile: { name: "Webhook Test Lead" } }],
      messages: [{ from: "9199900001", id: messageId, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: "Hello from webhook test" } }],
    } }] }],
  });
}

describe("webhook idempotency", () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  const externalAccountId = `test_wa_account_${runId}`;

  beforeAll(async () => {
    tenant = await createTestTenant("Webhook Tenant");
    await withTenantContext(tenant.id, (tx) =>
      tx.integrationConnection.create({
        data: { tenantId: tenant.id, provider: "WHATSAPP", mode: "MOCK", status: "CONNECTED", externalAccountId },
      }),
    );
  });

  afterAll(async () => {
    await prisma.webhookEvent.deleteMany({ where: { provider: "WHATSAPP", tenantId: tenant.id } });
    await cleanupTenant(tenant.id);
    await prisma.$disconnect();
  });

  it("rejects a payload with an invalid signature without touching any tenant data", async () => {
    const body = whatsappPayload(externalAccountId, `wamid.invalid-sig-test-${runId}`);
    const result = await processInboundWebhook("WHATSAPP", body, "sha256=not-a-real-signature");
    expect(result.signatureValid).toBe(false);
    expect(result.processed).toBe(0);

    const leads = await withTenantContext(tenant.id, (tx) => tx.lead.findMany({ where: { tenantId: tenant.id } }));
    expect(leads).toHaveLength(0);
  });

  it("processes a validly-signed webhook exactly once and creates a lead", async () => {
    const messageId = `wamid.idempotency-test-1-${runId}`;
    const body = whatsappPayload(externalAccountId, messageId);

    const first = await processInboundWebhook("WHATSAPP", body, sign(body));
    expect(first.signatureValid).toBe(true);
    expect(first.processed).toBe(1);
    expect(first.skippedDuplicates).toBe(0);

    const leads = await withTenantContext(tenant.id, (tx) => tx.lead.findMany({ where: { tenantId: tenant.id } }));
    expect(leads).toHaveLength(1);
    expect(leads[0].name).toBe("Webhook Test Lead");
  });

  it("re-delivering the exact same webhook event is a no-op (does not duplicate the lead or message)", async () => {
    const messageId = `wamid.idempotency-test-2-${runId}`;
    const body = whatsappPayload(externalAccountId, messageId);
    const signature = sign(body);

    const first = await processInboundWebhook("WHATSAPP", body, signature);
    expect(first.processed).toBe(1);

    // Simulate the provider retrying/re-delivering the identical webhook.
    const second = await processInboundWebhook("WHATSAPP", body, signature);
    expect(second.processed).toBe(0);
    expect(second.skippedDuplicates).toBe(1);

    const messages = await withTenantContext(tenant.id, (tx) =>
      tx.message.findMany({ where: { tenantId: tenant.id, externalMessageId: messageId } }),
    );
    expect(messages).toHaveLength(1);
  });
});
