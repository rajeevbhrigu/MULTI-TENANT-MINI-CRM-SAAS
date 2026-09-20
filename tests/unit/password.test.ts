import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, passwordStrengthError } from "@/server/auth/password";

describe("password handling", () => {
  it("hashes passwords with bcrypt (never stores plaintext)", async () => {
    const hash = await hashPassword("CorrectHorseBattery1");
    expect(hash).not.toBe("CorrectHorseBattery1");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifyPassword accepts the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("CorrectHorseBattery1");
    expect(await verifyPassword("CorrectHorseBattery1", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("passwordStrengthError enforces minimum complexity", () => {
    expect(passwordStrengthError("short")).toBeTruthy();
    expect(passwordStrengthError("alllowercase1")).toBeTruthy();
    expect(passwordStrengthError("NOLOWERCASE1")).toBeTruthy();
    expect(passwordStrengthError("NoDigitsHere")).toBeTruthy();
    expect(passwordStrengthError("ValidPass123")).toBeNull();
  });
});
