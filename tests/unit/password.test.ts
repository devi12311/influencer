import { describe, expect, it } from "vitest";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "@/server/auth/password";

describe("password policy", () => {
  it("rejects weak passwords", () => {
    const result = validatePasswordPolicy("password");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Password must contain at least one digit.");
  });

  it("accepts strong passwords", () => {
    const result = validatePasswordPolicy("StrongerPass123");

    expect(result.success).toBe(true);
  });

  it("hashes and verifies passwords", async () => {
    const passwordHash = await hashPassword("StrongerPass123");

    await expect(verifyPassword(passwordHash, "StrongerPass123")).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "WrongPass123")).resolves.toBe(false);
  });
});
