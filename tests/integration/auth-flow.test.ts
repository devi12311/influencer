import { describe, expect, it } from "vitest";
import { normalizeRedirectTarget } from "@/server/auth/request";

describe("auth flow helpers", () => {
  it("normalizes unsafe redirects", () => {
    expect(normalizeRedirectTarget("https://example.com")).toBe("/");
    expect(normalizeRedirectTarget("//evil.com")).toBe("/");
    expect(normalizeRedirectTarget("/settings")).toBe("/settings");
  });
});
