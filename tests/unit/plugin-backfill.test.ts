/**
 * Unit — contactsToEntitlementRows (lib/plugins/backfill.ts), P-3 backfill transform.
 *
 * Locks the contract: lower-case + de-dupe email, drop blanks, INCLUDE unsubscribed contacts (an
 * audience opt-out is not a download revocation), and tag source as '{plugin}_backfill' so backfilled
 * rows are distinguishable from live '{plugin}_lp' captures.
 */
import { describe, it, expect } from "vitest";
import { contactsToEntitlementRows } from "@/lib/plugins/backfill";

describe("contactsToEntitlementRows", () => {
  it("lower-cases and trims emails, tags source '{plugin}_backfill'", () => {
    const rows = contactsToEntitlementRows("muedsat", [{ email: "  Owner@Studio.JP " }]);
    expect(rows).toEqual([{ email: "owner@studio.jp", pluginKey: "muedsat", source: "muedsat_backfill" }]);
  });

  it("de-duplicates by email case-insensitively (one row per person)", () => {
    const rows = contactsToEntitlementRows("muedlim", [
      { email: "a@b.co" },
      { email: "A@B.CO" },
      { email: "a@b.co" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "a@b.co", pluginKey: "muedlim", source: "muedlim_backfill" });
  });

  it("INCLUDES unsubscribed contacts (opt-out ≠ download revocation; the portal is not email)", () => {
    const rows = contactsToEntitlementRows("muedsat", [{ email: "quiet@b.co", unsubscribed: true }]);
    expect(rows.map((r) => r.email)).toEqual(["quiet@b.co"]);
  });

  it("drops blank / null / whitespace-only emails", () => {
    const rows = contactsToEntitlementRows("muedsat", [
      { email: "" },
      { email: "   " },
      { email: null },
      {},
      { email: "real@b.co" },
    ]);
    expect(rows.map((r) => r.email)).toEqual(["real@b.co"]);
  });

  it("empty / null / undefined input → [] (no crash)", () => {
    expect(contactsToEntitlementRows("muedsat", [])).toEqual([]);
    expect(contactsToEntitlementRows("muedsat", null)).toEqual([]);
    expect(contactsToEntitlementRows("muedsat", undefined)).toEqual([]);
  });
});
