/**
 * Unit — user portal SECURITY CORE (lib/plugins/portal.ts), P-2.
 *
 * Locks the conductor's non-negotiable Tier3 conditions at the pure-logic level (plan-brief §4#1):
 *   - verifiedEmailsOf: ONLY verified emails are ownership keys (fail-closed) — an unverified address
 *     never grants access; empty/null → [] (portal shows nothing, never everything).
 *   - buildPortalItems: maps ownership → current distributable via the registry, emits NO licenseKey
 *     (P-2 = free modules only), skips unknown keys, dedups, orders newest-claim-first.
 *
 * (The DB filter `email = ANY(verifiedEmailsOf(user))` is the server component's job and is covered by
 * the page-level cross-user leakage test that ships with app/dashboard/plugins.)
 */
import { describe, it, expect, vi } from "vitest";

// Deterministic registry so assertions don't drift when the real version/URL is bumped.
vi.mock("@/lib/plugins/registry", () => ({
  PLUGIN_DIST: {
    muedsat: { key: "muedsat", i18nNamespace: "muedsat", version: "1.2.3", downloadUrl: "https://cdn/sat.pkg" },
    muedlim: { key: "muedlim", i18nNamespace: "muedlim", version: "4.5.6", downloadUrl: "https://cdn/lim.pkg" },
  },
}));

import { verifiedEmailsOf, buildPortalItems, type PortalItem } from "@/lib/plugins/portal";

describe("verifiedEmailsOf — verified email is the only ownership key (fail-closed)", () => {
  it("returns only VERIFIED addresses, lower-cased", () => {
    const emails = verifiedEmailsOf({
      emailAddresses: [
        { emailAddress: "Owner@Example.com", verification: { status: "verified" } },
        { emailAddress: "unverified@evil.com", verification: { status: "unverified" } },
        { emailAddress: "no-verif@evil.com", verification: null },
        { emailAddress: "missing-status@evil.com" },
      ],
    });
    expect(emails).toEqual(["owner@example.com"]);
  });

  it("an UNVERIFIED email does NOT grant access (the takeover vector is closed)", () => {
    // A user adds someone else's address but never verifies it → it must not become an ownership key.
    const emails = verifiedEmailsOf({
      emailAddresses: [{ emailAddress: "victim@someoneelse.com", verification: { status: "unverified" } }],
    });
    expect(emails).toEqual([]);
  });

  it("de-duplicates verified addresses case-insensitively", () => {
    const emails = verifiedEmailsOf({
      emailAddresses: [
        { emailAddress: "a@b.co", verification: { status: "verified" } },
        { emailAddress: "A@B.CO", verification: { status: "verified" } },
      ],
    });
    expect(emails).toEqual(["a@b.co"]);
  });

  it("null / empty user → [] (fail-closed: nothing owned, never everything)", () => {
    expect(verifiedEmailsOf(null)).toEqual([]);
    expect(verifiedEmailsOf(undefined)).toEqual([]);
    expect(verifiedEmailsOf({})).toEqual([]);
    expect(verifiedEmailsOf({ emailAddresses: [] })).toEqual([]);
  });
});

describe("buildPortalItems — ownership → current distributable, licenseKey-free", () => {
  it("maps an owned plugin to its registry version + download URL + i18n namespace", () => {
    const items = buildPortalItems([{ pluginKey: "muedsat", createdAt: new Date("2026-07-01") }]);
    expect(items).toEqual([
      {
        pluginKey: "muedsat",
        i18nNamespace: "muedsat",
        version: "1.2.3",
        downloadUrl: "https://cdn/sat.pkg",
        claimedAt: new Date("2026-07-01"),
      },
    ]);
  });

  it("NEVER emits a licenseKey field (P-2 = free modules only)", () => {
    const items = buildPortalItems([
      { pluginKey: "muedsat", createdAt: new Date("2026-07-01") },
      { pluginKey: "muedlim", createdAt: new Date("2026-07-02") },
    ]);
    for (const item of items) {
      expect(item).not.toHaveProperty("licenseKey");
      expect(Object.keys(item)).toEqual(
        expect.arrayContaining(["pluginKey", "i18nNamespace", "version", "downloadUrl", "claimedAt"]),
      );
      expect(Object.keys(item)).toHaveLength(5); // exactly those 5 — no extra field can leak
    }
  });

  it("skips unknown / legacy plugin keys (not in the registry)", () => {
    const items = buildPortalItems([
      { pluginKey: "muedsat", createdAt: new Date("2026-07-01") },
      { pluginKey: "mued-does-not-exist", createdAt: new Date("2026-07-01") },
    ]);
    expect(items.map((i) => i.pluginKey)).toEqual(["muedsat"]);
  });

  it("collapses a plugin owned under two verified emails (dedup)", () => {
    const items = buildPortalItems([
      { pluginKey: "muedsat", createdAt: new Date("2026-07-01") },
      { pluginKey: "muedsat", createdAt: new Date("2026-07-05") },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].pluginKey).toBe("muedsat");
  });

  it("orders newest-claim-first", () => {
    const items = buildPortalItems([
      { pluginKey: "muedsat", createdAt: new Date("2026-07-01") },
      { pluginKey: "muedlim", createdAt: new Date("2026-07-10") },
    ]);
    expect(items.map((i) => i.pluginKey)).toEqual(["muedlim", "muedsat"]);
  });

  it("empty / null entitlements → [] (no crash)", () => {
    expect(buildPortalItems([])).toEqual([]);
    expect(buildPortalItems(null)).toEqual([]);
    expect(buildPortalItems(undefined)).toEqual([]);
  });

  it("PortalItem type carries no licenseKey (compile-time guard)", () => {
    // @ts-expect-error — licenseKey is not part of PortalItem; adding one must fail typecheck.
    const bad: PortalItem = {
      pluginKey: "muedsat",
      i18nNamespace: "muedsat",
      version: "1.2.3",
      downloadUrl: "https://cdn/sat.pkg",
      claimedAt: new Date(),
      licenseKey: "SHOULD-NOT-COMPILE",
    };
    expect(bad).toBeDefined();
  });
});
