/**
 * Unit — getPurchaseItemsForUser (lib/plugins/portal-data.ts), P-4 page-level authorization.
 *
 * ★This is the Tier-3 test for the PAID line. It is the free line's sibling
 * (plugin-portal-data.test.ts) on purpose: the same boundary, asserted the same way, so a reader
 * comparing them can see that the licence path did not get its own weaker rule.
 *
 * ★What makes this one different: the row carries a licenceKey. So besides "only my rows", we assert
 * that a key belonging to someone else is structurally unreachable — the address it is keyed by never
 * enters the WHERE unless Clerk says the caller verified it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the email set the query is scoped to (the authorization boundary in action).
let capturedEmails: string[] | null = null;
vi.mock("drizzle-orm", () => ({
  inArray: (_col: unknown, vals: string[]) => {
    capturedEmails = vals;
    return { __inArray: vals };
  },
  and: (...a: unknown[]) => ({ __and: a }),
  isNull: (c: unknown) => ({ __isNull: c }),
}));

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
vi.mock("@/db", () => ({ db: { select: (...a: unknown[]) => mockSelect(...a) } }));

vi.mock("@/db/schema", () => ({
  pluginEntitlements: { email: "pe_email", pluginKey: "pe_pk", createdAt: "pe_ca", portalRegisteredAt: "pe_pr" },
  masterchainPurchases: { productId: "mp_product", email: "mp_email", licenseKey: "mp_key", createdAt: "mp_ca" },
}));

vi.mock("@/lib/masterchain/config", () => ({
  MASTERCHAIN_DOWNLOAD_URL: "https://mued.jp/downloads/MUEDsp-masterchain-0.1.3-installer.pkg",
  // masterchain for Windows — off, as shipped (tests/unit/windows-launch-prep.test.tsx covers it on).
  MASTERCHAIN_WINDOWS_LIVE: false,
  MASTERCHAIN_WINDOWS_URL: "",
  MASTERCHAIN_WINDOWS_VERSION: "",
}));

const vox = vi.hoisted(() => ({ download: "", windows: "", version: "" }));
vi.mock("@/lib/muedvox/config", () => ({
  get MUEDVOX_DOWNLOAD_URL() { return vox.download; },
  get MUEDVOX_WINDOWS_URL() { return vox.windows; },
  get MUEDVOX_WINDOWS_VERSION() { return vox.version; },
}));

import { getPurchaseItemsForUser } from "@/lib/plugins/portal-data";

const verified = (email: string) => ({ emailAddress: email, verification: { status: "verified" } });
const unverified = (email: string) => ({ emailAddress: email, verification: { status: "unverified" } });
const KEY = "MUEDSP-LICENSE-v2\nproduct=MUEDsp\nscope=masterchain\nsig=AAAA\n";
const OTHERS_KEY = "MUEDSP-LICENSE-v2\nproduct=MUEDsp\nscope=masterchain\nsig=VICTIM\n";

beforeEach(() => {
  vi.clearAllMocks();
  vox.download = "";
  vox.windows = "";
  vox.version = "";
  capturedEmails = null;
  mockWhere.mockResolvedValue([]);
});

describe("getPurchaseItemsForUser — the licence query is scoped to VERIFIED emails only", () => {
  it("★an UNVERIFIED address never reaches the query (someone else's key stays unreachable)", async () => {
    mockWhere.mockResolvedValue([{ productId: "muedsp_masterchain", licenseKey: KEY, createdAt: new Date("2026-09-01") }]);
    const items = await getPurchaseItemsForUser({
      emailAddresses: [verified("me@studio.jp"), unverified("victim@someoneelse.com")],
    });
    expect(capturedEmails).toEqual(["me@studio.jp"]);
    expect(capturedEmails).not.toContain("victim@someoneelse.com");
    expect(items).toHaveLength(1);
    expect(items[0].licenseKey).toBe(KEY);
  });

  it("★★FAIL-CLOSED: no verified email → [] and NO query is run (never returns every buyer's key)", async () => {
    const items = await getPurchaseItemsForUser({ emailAddresses: [unverified("me@studio.jp")] });
    expect(items).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled(); // the DB is never touched without a verified key
  });

  it("null / empty user → [] and no query", async () => {
    expect(await getPurchaseItemsForUser(null)).toEqual([]);
    expect(await getPurchaseItemsForUser({})).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("scopes to ALL of the caller's verified emails (multi-email account), lower-cased", async () => {
    await getPurchaseItemsForUser({ emailAddresses: [verified("A@x.co"), verified("b@X.co")] });
    expect(capturedEmails).toEqual(["a@x.co", "b@x.co"]);
  });

  it("★selects ONLY productId + licenseKey + createdAt + refundedAt — amount / order id / EULA columns are never fetched", async () => {
    await getPurchaseItemsForUser({ emailAddresses: [verified("me@studio.jp")] });
    const projection = mockSelect.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(projection).sort()).toEqual(["createdAt", "licenseKey", "productId", "refundedAt"]);
  });

  it("★a row with no licenceKey is skipped, not rendered as an empty box", async () => {
    mockWhere.mockResolvedValue([
      { productId: "muedsp_masterchain", licenseKey: null, createdAt: new Date("2026-09-02") },
      { productId: "muedsp_masterchain", licenseKey: "   ", createdAt: new Date("2026-09-03") },
      { productId: "muedsp_masterchain", licenseKey: KEY, createdAt: new Date("2026-09-01") },
    ]);
    const items = await getPurchaseItemsForUser({ emailAddresses: [verified("me@studio.jp")] });
    expect(items).toHaveLength(1);
    expect(items[0].licenseKey).toBe(KEY);
  });

  it("★the same key under two verified addresses appears once, newest purchase first", async () => {
    mockWhere.mockResolvedValue([
      { productId: "muedsp_masterchain", licenseKey: KEY, createdAt: new Date("2026-09-01") },
      { productId: "muedsp_masterchain", licenseKey: KEY, createdAt: new Date("2026-09-05") },
      { productId: "muedsp_masterchain", licenseKey: OTHERS_KEY, createdAt: new Date("2026-09-09") },
    ]);
    const items = await getPurchaseItemsForUser({ emailAddresses: [verified("a@x.co"), verified("b@x.co")] });
    expect(items.map((i) => i.licenseKey)).toEqual([OTHERS_KEY, KEY]); // deduped, newest first
  });

  it("carries the current download URL and a version parsed from it (no second constant)", async () => {
    mockWhere.mockResolvedValue([{ productId: "muedsp_masterchain", licenseKey: KEY, createdAt: new Date("2026-09-01") }]);
    const [item] = await getPurchaseItemsForUser({ emailAddresses: [verified("me@studio.jp")] });
    expect(item.downloadUrl).toBe("https://mued.jp/downloads/MUEDsp-masterchain-0.1.3-installer.pkg");
    expect(item.version).toBe("0.1.3");
    expect(item.productKey).toBe("masterchain");
    expect(item.displayName).toBe("masterchain");
    expect(item.keyFileName).toBe("MUEDsp-masterchain.license.key");
  });

  it("★★the free-line query and the licence query use the SAME email set (one boundary, not two)", async () => {
    const { getPortalItemsForUser } = await import("@/lib/plugins/portal-data");
    const user = { emailAddresses: [verified("me@studio.jp"), unverified("victim@someoneelse.com")] };
    await getPortalItemsForUser(user);
    const freeEmails = capturedEmails;
    capturedEmails = null;
    await getPurchaseItemsForUser(user);
    expect(capturedEmails).toEqual(freeEmails);
  });
});

it("resolves a recorded disabled MUEDvox purchase and skips unknown product IDs", async () => {
  mockWhere.mockResolvedValue([
    { productId: "unknown", licenseKey: KEY, createdAt: new Date() },
    { productId: "muedsp_vox", licenseKey: KEY, createdAt: new Date() },
  ]);
  const items = await getPurchaseItemsForUser({ emailAddresses: [verified("me@studio.jp")] });
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ productKey: "muedvox", displayName: "MUEDvox", keyFileName: "MUEDvox.license.key", downloadUrl: "", windows: null, version: null, licenseKey: KEY });
});


it("uses MUEDvox installer and Windows constants when configured", async () => {
  vox.download = "https://mued.jp/downloads/MUEDvox-1.2.3-installer.pkg";
  vox.windows = "https://mued.jp/downloads/MUEDvox-1.2.3.zip";
  vox.version = "1.2.3";
  mockWhere.mockResolvedValue([{ productId: "muedsp_vox", licenseKey: KEY, createdAt: new Date() }]);
  const [item] = await getPurchaseItemsForUser({ emailAddresses: [verified("me@studio.jp")] });
  expect(item).toMatchObject({ downloadUrl: vox.download, version: "1.2.3", windows: { url: vox.windows, version: vox.version } });
});
