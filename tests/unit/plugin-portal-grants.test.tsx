/**
 * The portal row for a time-limited key we handed out (plugin_license_grants — testers).
 * Same boundary as purchases (the caller's VERIFIED emails only); its own words — never "purchased".
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

const m = vi.hoisted(() => ({ select: vi.fn(), from: vi.fn(), where: vi.fn(), emails: null as string[] | null, locale: "ja" as "ja" | "en" }));
vi.mock("drizzle-orm", () => ({
  inArray: (_column: unknown, values: string[]) => { m.emails = values; return { inArray: values }; },
  eq: vi.fn(), and: vi.fn(), isNull: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: m.select } }));
const log = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }));
vi.mock("@/lib/utils/logger", () => ({ logger: log }));
vi.mock("@/db/schema", () => ({
  pluginEntitlements: {}, masterchainPurchases: {}, masterchainTrials: {},
  pluginLicenseGrants: { email: "g_email", productId: "g_product", licenseKey: "g_key", issuedAt: "g_issued", expiresAt: "g_expires" },
}));
vi.mock("@/app/dashboard/plugins/plugins-portal.module.css", () => ({ default: new Proxy({}, { get: (_t, k) => String(k) }) }));
vi.mock("next-intl", () => ({
  useLocale: () => m.locale,
  useTranslations: (namespace: string) => (key: string, vars?: Record<string, unknown>) => {
    const messages = (m.locale === "ja" ? ja : en) as unknown as Record<string, unknown>;
    let text = `${namespace}.${key}`.split(".").reduce((value: any, part) => value?.[part], messages) as string;
    if (typeof text !== "string") throw new Error(`missing message ${namespace}.${key}`);
    // ICU select as the portal uses it ({masterchain, select, yes {...} other {...}}), then plain {vars}.
    text = text.replace(/\{(\w+), select, yes \{([^}]*)\} other \{([^}]*)\}\}/g, (_all, name, yes, other) => (vars?.[name] === "yes" ? yes : other));
    return text.replace(/\{(\w+)\}/g, (_all, name) => String(vars?.[name] ?? `{${name}}`));
  },
}));

import { PluginsPortalView, type GrantViewItem } from "@/app/dashboard/plugins/plugins-portal-view";
import { MUEDVOX_DOWNLOAD_URL, MUEDVOX_WINDOWS_URL } from "@/lib/muedvox/config";
import { buildGrantItems } from "@/lib/plugins/portal";
import { getGrantItemsForUser } from "@/lib/plugins/portal-data";
import { PAID_PRODUCTS } from "@/lib/plugins/paid-products";

const verified = (emailAddress: string) => ({ emailAddress, verification: { status: "verified" } });
const NOW = new Date("2026-10-14T00:00:00Z");
const row = (licenseKey: string, expiresAt: string, productId = "muedsp_vox") =>
  ({ productId, licenseKey, issuedAt: new Date("2026-10-13T14:00:00Z"), expiresAt: new Date(expiresAt) });

beforeEach(() => {
  m.emails = null; m.locale = "ja";
  m.select.mockReset(); m.from.mockReset(); m.where.mockReset();
  m.select.mockReturnValue({ from: m.from });
  m.from.mockReturnValue({ where: m.where });
  m.where.mockResolvedValue([]);
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
});
afterEach(cleanup);

describe("★ownership: the caller's verified emails only", () => {
  it.each([null, undefined, {}, { emailAddresses: [{ emailAddress: "victim@example.com", verification: { status: "unverified" } }] }])(
    "fails closed without a verified email — the query is not run: %j", async (user) => {
      expect(await getGrantItemsForUser(user)).toEqual([]);
      expect(m.select).not.toHaveBeenCalled();
    });

  it("★a grant issued before the account existed shows up for whoever verified that address (lower-cased), and for nobody else", async () => {
    m.where.mockResolvedValue([row("KEY-A\n", "2026-10-27T14:00:00Z")]);
    const items = await getGrantItemsForUser({ emailAddresses: [verified(" Tester@Example.com "), { emailAddress: "victim@example.com", verification: { status: "unverified" } }] });
    expect(m.emails).toEqual(["tester@example.com"]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productKey: "muedvox", displayName: "MUEDvox", keyFileName: "MUEDvox.license.key", licenseKey: "KEY-A\n",
      downloadUrl: MUEDVOX_DOWNLOAD_URL, version: "1.1.0", windows: { url: MUEDVOX_WINDOWS_URL, version: "1.1.0" },
    });
    expect(items[0]).not.toHaveProperty("purchasedAt");
  });

  it("★a missing table (migration 0064 not applied) does not take the portal down: no rows, no throw", async () => {
    m.where.mockRejectedValue(new Error('relation "plugin_license_grants" does not exist'));
    expect(await getGrantItemsForUser({ emailAddresses: [verified("tester@example.com")] })).toEqual([]);
    expect(log.error).toHaveBeenCalledTimes(1); // not silent (CCO #1276)
    expect(JSON.stringify(log.error.mock.calls)).not.toContain("tester@example.com");
  });
});

describe("buildGrantItems", () => {
  const resolve = (productId: string) => productId === "muedsp_vox"
    ? { product: PAID_PRODUCTS.muedvox, downloadUrl: "https://mued.jp/downloads/MUEDvox-1.0.0-installer.pkg", windows: null } : null;

  it("★the latest expiry first (an extension sits above the key it extends), deduped, unknown products dropped, expired labelled", () => {
    const items = buildGrantItems([
      row("FIRST", "2026-10-13T23:00:00Z"), row("EXTENSION", "2026-11-26T14:00:00Z"), row("FIRST", "2026-10-13T23:00:00Z"),
      row("OTHER", "2026-12-01T00:00:00Z", "not_a_product"), row(" ", "2026-12-01T00:00:00Z"),
    ], resolve, NOW);
    expect(items.map((i) => [i.licenseKey, i.expired])).toEqual([["EXTENSION", false], ["FIRST", true]]);
  });

  it("the instant of expiry counts as expired; null / empty input is an empty shelf", () => {
    expect(buildGrantItems([row("K", NOW.toISOString())], resolve, NOW)[0].expired).toBe(true);
    expect(buildGrantItems(null, resolve, NOW)).toEqual([]);
  });
});

describe("★the row on the page", () => {
  const grant = (over: Partial<GrantViewItem> = {}): GrantViewItem => ({
    productKey: "muedvox", displayName: "MUEDvox", keyFileName: "MUEDvox.license.key", version: "1.0.0",
    downloadUrl: "https://mued.jp/downloads/MUEDvox-1.0.0-installer.pkg",
    windows: { url: "https://mued.jp/downloads/MUEDvox-1.0.0-win-x64-be75a5d2.zip", version: "1.0.0" },
    licenseKey: "MUEDSP-LICENSE-v2\nsig=abc\n", expiresAtISO: "2026-10-27T14:03:00Z", expired: false, ...over,
  });

  it.each(["ja", "en"] as const)("%s: MUEDvox, the label, the expiry to the minute, both downloads, the key actions — and never \"purchased\"", (locale) => {
    m.locale = locale;
    render(<PluginsPortalView items={[]} grants={[grant()]} />);
    const card = screen.getByTestId("portal-grant");
    // ★plate | text | actions, like every paid card (#1277: without the plate the text is laid out in 96px).
    expect([...card.children].map((c) => (c.getAttribute("class") ?? "").split(" ")[0])).toEqual(["faceplate", "meta", "action"]);
    expect(within(card).getByRole("heading", { level: 3 }).textContent).toBe("MUEDvox");
    expect(card.textContent).toContain(locale === "ja" ? "テスト用ライセンス" : "Test license");
    expect(within(card).getByTestId("portal-grant-expiry").textContent).toBe(
      locale === "ja" ? "2026-10-27 14:03（UTC）まで使えます" : "Valid until 2026-10-27 14:03 (UTC)");
    const hrefs = within(card).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://mued.jp/downloads/MUEDvox-1.0.0-installer.pkg");
    expect(hrefs).toContain("https://mued.jp/downloads/MUEDvox-1.0.0-win-x64-be75a5d2.zip");
    expect(within(card).getByRole("button", { name: locale === "ja" ? "キーをコピー" : "Copy key" })).toBeInTheDocument();
    expect(card.textContent).toContain(locale === "ja" ? "鍵のファイル（.key）をダウンロード" : "Download your key file (.key)");
    // ★The whole page, not just the card: a tester with no purchase sees no "purchased" anywhere.
    expect(document.body.textContent).not.toMatch(/購入|purchase|bought/i);
    expect(document.body.textContent).not.toContain("Drop license.key here"); // masterchain's screen, not MUEDvox's
  });

  it.each(["ja", "en"] as const)("%s: expired — says so with the date, and the key stays downloadable", (locale) => {
    m.locale = locale;
    render(<PluginsPortalView items={[]} grants={[grant({ expired: true, expiresAtISO: "2026-10-13T14:08:00Z" })]} />);
    const card = screen.getByTestId("portal-grant");
    expect(within(card).getByTestId("portal-grant-expiry").textContent).toBe(
      locale === "ja" ? "期限が切れました（2026-10-13 14:08 UTC）" : "Expired (2026-10-13 14:08 UTC)");
    expect(within(card).getByRole("button", { name: locale === "ja" ? "キーをコピー" : "Copy key" })).toBeInTheDocument();
  });

  // ★masterchain grants (#1292, CCO's note): the same card with masterchain's own name, key file and drop target.
  //   The plate is not pinned here: masterchain has no art of its own yet (it falls back — status ④, kimny decides).
  it.each(["ja", "en"] as const)("%s: a masterchain grant — its name, its key file, the 「Drop license.key here」 line, not MUEDvox's screen", (locale) => {
    m.locale = locale;
    render(<PluginsPortalView items={[]} grants={[grant({
      productKey: "masterchain", displayName: "masterchain", keyFileName: "MUEDsp-masterchain.license.key", version: "1.0.2",
      downloadUrl: "https://mued.jp/downloads/MUEDsp-masterchain-1.0.2-installer.pkg", windows: null,
    })]} />);
    const card = screen.getByTestId("portal-grant");
    expect(within(card).getByRole("heading", { level: 3 }).textContent).toBe("masterchain");
    expect(card.textContent).toContain("Drop license.key here");
    expect(card.querySelector('[data-testid="paid-plate-muedvox"]')).toBeNull();
    expect(within(card).getAllByRole("link").map((a) => a.getAttribute("href"))).toContain("https://mued.jp/downloads/MUEDsp-masterchain-1.0.2-installer.pkg");
    expect(card.textContent).not.toContain("MUEDvox");
  });

  it("no grants → no section (control: with one, the section label is there)", () => {
    const { container, rerender } = render(<PluginsPortalView items={[]} />);
    expect(container.querySelector('[data-testid="portal-grant"]')).toBeNull();
    expect(container.textContent).not.toContain("テスト用ライセンス");
    rerender(<PluginsPortalView items={[]} grants={[grant()]} />);
    expect(container.textContent).toContain("テスト用ライセンス");
  });

  it("the two locales carry the same grant keys", () => {
    expect(Object.keys(ja.pluginPortal.grant)).toEqual(Object.keys(en.pluginPortal.grant));
  });
});
