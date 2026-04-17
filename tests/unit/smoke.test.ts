import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/date";

describe("formatDateTime", () => {
  it("formats a date-like value", () => {
    const result = formatDateTime("2026-04-16T18:54:20.000Z");

    expect(result).toContain("2026");
  });
});
