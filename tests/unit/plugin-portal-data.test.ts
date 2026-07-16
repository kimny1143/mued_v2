/**
 * Unit — getPortalItemsForUser (lib/plugins/portal-data.ts), P-2 page-level authorization.
 *
 * This is the conductor's non-negotiable Tier3 test (plan-brief §4#1): the DB query is scoped to the
 * authenticated user's VERIFIED emails ONLY, so another user's rows are structurally unreachable and
 * no licenseKey can leak. We assert the exact email set that reaches the WHERE (by capturing the
 * inArray filter), plus the fail-closed path (no verified email → no query at all).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the email set that the query is scoped to (the authorization boundary in action).
let capturedEmails: string[] | null = null;
vi.mock("drizzle-orm", () => ({
  inArray: (_col: unknown, vals: string[]) => {
    capturedEmails = vals;
    return { __inArray: vals };
  },
}));

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
vi.mock("@/db", () => ({ db: { select: (...a: unknown[]) => mockSelect(...a) } }));

vi.mock("@/db/schema", () => ({
  pluginEntitlements: { email: "email_col", pluginKey: "pk_col", createdAt: "ca_col" },
}));

vi.mock("@/lib/plugins/registry", () => ({
  PLUGIN_DIST: {
    muedsat: { key: "muedsat", i18nNamespace: "muedsat", version: "1.2.3", downloadUrl: "https://cdn/sat.pkg" },
    muedlim: { key: "muedlim", i18nNamespace: "muedlim", version: "4.5.6", downloadUrl: "https://cdn/lim.pkg" },
  },
}));

import { getPortalItemsForUser } from "@/lib/plugins/portal-data";

const verified = (email: string) => ({ emailAddress: email, verification: { status: "verified" } });
const unverified = (email: string) => ({ emailAddress: email, verification: { status: "unverified" } });

beforeEach(() => {
  vi.clearAllMocks();
  capturedEmails = null;
  mockWhere.mockResolvedValue([]);
});

describe("getPortalItemsForUser — the query is scoped to VERIFIED emails only", () => {
  it("an UNVERIFIED address never reaches the query (cross-user takeover blocked)", async () => {
    mockWhere.mockResolvedValue([{ pluginKey: "muedsat", createdAt: new Date("2026-07-01") }]);
    const items = await getPortalItemsForUser({
      emailAddresses: [verified("me@studio.jp"), unverified("victim@someoneelse.com")],
    });
    // ONLY the verified email is in the WHERE — the other person's address is structurally excluded.
    expect(capturedEmails).toEqual(["me@studio.jp"]);
    expect(capturedEmails).not.toContain("victim@someoneelse.com");
    expect(items.map((i) => i.pluginKey)).toEqual(["muedsat"]);
  });

  it("scopes to ALL of the user's verified emails (multi-email account), lower-cased", async () => {
    await getPortalItemsForUser({ emailAddresses: [verified("A@X.co"), verified("b@x.co")] });
    expect(capturedEmails).toEqual(["a@x.co", "b@x.co"]);
  });

  it("FAIL-CLOSED: no verified email → [] and NO query is run (never returns everything)", async () => {
    const items = await getPortalItemsForUser({ emailAddresses: [unverified("x@y.co")] });
    expect(items).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled(); // the DB is never touched without a verified key
  });

  it("null / empty user → [] and no query", async () => {
    expect(await getPortalItemsForUser(null)).toEqual([]);
    expect(await getPortalItemsForUser({})).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("maps returned rows via the registry and emits NO licenseKey", async () => {
    mockWhere.mockResolvedValue([
      { pluginKey: "muedsat", createdAt: new Date("2026-07-01") },
      { pluginKey: "muedlim", createdAt: new Date("2026-07-02") },
    ]);
    const items = await getPortalItemsForUser({ emailAddresses: [verified("a@b.co")] });
    expect(items.map((i) => i.pluginKey)).toEqual(["muedlim", "muedsat"]); // newest-first
    for (const it of items) {
      expect(it).not.toHaveProperty("licenseKey");
      expect(it.version).toBeTruthy();
      expect(it.downloadUrl).toBeTruthy();
    }
  });
});
