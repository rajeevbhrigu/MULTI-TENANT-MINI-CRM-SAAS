import { describe, it, expect } from "vitest";
import { generateToken, hashToken, encryptSecret, decryptSecret } from "@/lib/crypto";

describe("crypto helpers", () => {
  it("generateToken produces unique, sufficiently long tokens", () => {
    const a = generateToken(32);
    const b = generateToken(32);
    expect(a).not.toBe(b);
    expect(a.length).toBe(64); // hex-encoded
  });

  it("hashToken is deterministic and one-way", () => {
    const token = "example-token-value";
    const h1 = hashToken(token);
    const h2 = hashToken(token);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(token);
    expect(h1.length).toBe(64); // sha256 hex
  });

  it("encryptSecret/decryptSecret round-trips integration credentials", () => {
    process.env.SECRETS_ENCRYPTION_KEY = "0".repeat(64);
    const plaintext = "super-secret-access-token";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("decryptSecret fails closed on tampered ciphertext", () => {
    process.env.SECRETS_ENCRYPTION_KEY = "0".repeat(64);
    const encrypted = encryptSecret("original-value");
    const tampered = encrypted.slice(0, -2) + "ff";
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
