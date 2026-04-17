import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({
  env: {
    MASTER_KEY: Buffer.from("0123456789abcdef0123456789abcdef").toString("base64"),
  },
}));

let open: typeof import("@/server/crypto/vault").open;
let seal: typeof import("@/server/crypto/vault").seal;

beforeEach(async () => {
  ({ open, seal } = await import("@/server/crypto/vault"));
});

describe("vault", () => {
  it("round-trips plaintext", () => {
    const sealed = seal("secret-token", "user-1");

    expect(open(sealed, "user-1")).toBe("secret-token");
  });

  it("throws when ciphertext is tampered with", () => {
    const sealed = seal("secret-token", "user-1");
    const tampered = `${sealed.slice(0, -4)}abcd`;

    expect(() => open(tampered, "user-1")).toThrow();
  });

  it("rejects cross-user decryption", () => {
    const sealed = seal("secret-token", "user-1");

    expect(() => open(sealed, "user-2")).toThrow();
  });
});
