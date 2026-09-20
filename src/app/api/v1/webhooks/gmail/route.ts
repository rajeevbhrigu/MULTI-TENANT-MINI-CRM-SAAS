import { NextRequest, NextResponse } from "next/server";
import { processInboundWebhook } from "@/server/integrations/webhook-handler";
import { checkRateLimit } from "@/server/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`webhook:gmail:${req.headers.get("x-forwarded-for") ?? "unknown"}`, 300, 60);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const rawBody = await req.text();
  // Real Gmail Pub/Sub push delivers a bearer JWT in Authorization; the mock
  // path checks a shared verification token instead. See gmail/adapter.ts.
  const result = await processInboundWebhook("GMAIL", rawBody, req.headers.get("authorization"));

  if (!result.signatureValid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  return NextResponse.json({ ok: true, ...result });
}
