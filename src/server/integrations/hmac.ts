import { createHmac, timingSafeEqual } from "crypto";

/** Verifies a `sha256=<hex>` style signature header (Meta/WhatsApp convention). */
export function verifyHmacSha256(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
