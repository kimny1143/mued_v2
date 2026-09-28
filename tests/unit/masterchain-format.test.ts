import { describe, it, expect } from "vitest";
import { formatUtcMinute } from "@/lib/masterchain/format";

describe("formatUtcMinute", () => {
  it("renders date and time in UTC, crossing a date boundary from +09:00", () => {
    expect(formatUtcMinute("2026-10-14T01:30:00+09:00")).toBe("2026-10-13 16:30");
    expect(formatUtcMinute(new Date("2026-10-13T16:30:59Z"))).toBe("2026-10-13 16:30");
  });
});
