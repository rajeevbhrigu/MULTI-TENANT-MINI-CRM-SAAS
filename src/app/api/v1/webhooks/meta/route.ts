import { NextRequest, NextResponse } from "next/server";
import { processInboundWebhook } from "@/server/integrations/webhook-handler";
import { checkRateLimit } from "@/server/rate-limit";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === (process.env.META_WEBHOOK_VERIFY_TOKEN ?? "dev-webhook-secret")) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`webhook:meta:${req.headers.get("x-forwarded-for") ?? "unknown"}`, 300, 60);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const rawBody = await req.text();
  const result = await processInboundWebhook("FACEBOOK", rawBody, req.headers.get("x-hub-signature-256"));

  if (!result.signatureValid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  return NextResponse.json({ ok: true, ...result });
}
