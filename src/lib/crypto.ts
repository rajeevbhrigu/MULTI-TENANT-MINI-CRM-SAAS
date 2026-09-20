import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

/** Opaque random token for cookies/invite links/API keys - shown to the user once. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** One-way hash for storing tokens (session tokens, reset tokens, API keys) at rest. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.SECRETS_ENCRYPTION_KEY;
  if (!key || key.length < 64) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY must be a 32-byte hex string (64 chars). Generate with `openssl rand -hex 32`.",
    );
  }
  return Buffer.from(key, "hex");
}

/** Encrypts integration credentials (e.g. WhatsApp/Meta/Gmail tokens) before persisting. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(".");
}

export function decryptSecret(encrypted: string): string {
  const [ivHex, tagHex, dataHex] = encrypted.split(".");
  const decipher = createDecipheriv(ALGO, getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
