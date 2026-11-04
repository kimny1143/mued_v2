// @vitest-environment node
/**
 * License grants (Tier 3 — key issuance): time-limited MUEDvox keys for testers.
 * kimny 2026-10-13 (MUED window): 「テスター向けに期限つきの MUEDvox の鍵を出す道を作って良い」.
 *
 * What must hold: (1) only kimny-as-admin can issue or list, everyone else gets 404; (2) a grant is a key for
 * scope=muedvox that expires — accepted before the expiry, not accepted after, rejected by masterchain; (3) the key
 * never appears in a response or a log; (4) nothing is written to the purchases table.
 * A throwaway Ed25519 pair stands in for the production signing key — the real key is never in a test.
 */
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, isAdmin, log, dbState } = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  dbState: { inserted: [] as Array<Record<string, unknown>>, tables: [] as unknown[], rows: [] as Array<Record<string, unknown>>, fail: false },
}));
vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("@/lib/middleware/admin", () => ({ isAdmin }));
vi.mock("@/lib/utils/logger", () => ({ logger: log }));
vi.mock("@/db", () => ({
  db: {
    insert: (table: unknown) => ({
      values: (v: Record<string, unknown>) => ({
        returning: async () => {
          if (dbState.fail) throw new Error('relation "plugin_license_grants" does not exist');
          dbState.tables.push(table);
          dbState.inserted.push(v);
          return [{ id: "grant-row-1" }];
        },
      }),
    }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: async () => dbState.rows }) }) }),
  },
}));

import { GET, POST } from "@/app/api/admin/license/grants/route";
import { masterchainPurchases, pluginLicenseGrants } from "@/db/schema";
import { evaluateLicense } from "@/lib/masterchain/license";
import {
  GRANT_ISSUER_USER_IDS, GRANTABLE_PRODUCTS, MAX_GRANT_MINUTES, parseGrantRequest, signGrant,
} from "@/lib/plugins/license-grants";
import { PAID_PRODUCTS } from "@/lib/plugins/paid-products";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUB = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRIV = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const ENV = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
const KIMNY = GRANT_ISSUER_USER_IDS[0];
const VOX = { product: "MUEDsp", scope: "muedvox" };
const GOOD = { email: "Tester@Example.com", product: "muedvox", days: 14, reason: "beta tester (replied to the MUEDlim mail)" };

const post = (body: unknown) => POST(new Request("https://mued.jp/api/admin/license/grants", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const get = (query: string) => GET(new Request(`https://mued.jp/api/admin/license/grants${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV;
  dbState.inserted = []; dbState.tables = []; dbState.rows = []; dbState.fail = false;
  auth.mockResolvedValue({ userId: KIMNY });
  isAdmin.mockResolvedValue(true);
});
afterEach(() => {
  if (ENV === undefined) delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  else process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = ENV;
});

describe("★who may issue: kimny as admin — everyone else gets 404 and nothing happens", () => {
  it.each([
    ["signed out", { userId: null }, true],
    ["another admin (not kimny)", { userId: "user_someone_else" }, true],
    ["kimny's id without the admin role", { userId: KIMNY }, false],
  ])("%s → 404 on POST and GET, no key signed, no row", async (_label, session, admin) => {
    auth.mockResolvedValue(session);
    isAdmin.mockResolvedValue(admin);
    for (const res of [await post(GOOD), await get("?email=tester@example.com")]) {
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await res.text()).toBe("Not Found");
    }
    expect(dbState.inserted).toEqual([]);
  });

  it("the two ids are the ones conductor pinned on 2026-10-07 (#1245); MUEDvox (the default) and masterchain (2026-10-15) can be granted", () => {
    expect(GRANT_ISSUER_USER_IDS).toEqual(["user_38Ke5H6xPB9tm7M2J2fxP082fP5", "user_33EiZv982KTQ6s6AfTCkbaYqkpR"]);
    expect(GRANTABLE_PRODUCTS).toEqual(["muedvox", "masterchain"]);
  });
});

describe("★a grant is a MUEDvox key that expires", () => {
  it("201: the row is written to plugin_license_grants (never the purchases table) and the stored key verifies", async () => {
    const before = Date.now();
    const res = await post(GOOD);
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(dbState.tables).toEqual([pluginLicenseGrants]);
    expect(dbState.tables).not.toContain(masterchainPurchases);
    const [row] = dbState.inserted;
    expect(row).toMatchObject({ email: "tester@example.com", productId: "muedsp_vox", reason: GOOD.reason, grantedBy: KIMNY, licenseVersion: 2 });
    expect(String(row.orderRef)).toMatch(/^grant-muedvox-[0-9a-f-]{36}$/);

    const key = String(row.licenseKey);
    const { verdict, payload } = evaluateLicense(key, PUB, VOX);
    expect(verdict).toBe("accept");
    expect(payload).toMatchObject({ product: "MUEDsp", scope: "muedvox", owner: "tester@example.com", order: row.orderRef });
    // 14 days from now, to the second (the plugin parses no fractional seconds).
    expect(payload?.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    const expiry = Date.parse(payload!.expiresAt);
    expect(expiry).toBeGreaterThanOrEqual(before + 14 * 86_400_000 - 1000);
    expect(expiry).toBeLessThanOrEqual(Date.now() + 14 * 86_400_000);
    expect((row.expiresAt as Date).toISOString().replace(".000Z", "Z")).toBe(payload!.expiresAt);
  });

  it("★after the expiry the same key is no longer accepted; and masterchain rejects it at any time", async () => {
    await post({ ...GOOD, days: undefined, minutes: 3 });
    const key = String(dbState.inserted[0].licenseKey);
    const now = Date.now();
    expect(evaluateLicense(key, PUB, VOX, new Date(now + 2 * 60_000)).verdict).toBe("accept");
    expect(evaluateLicense(key, PUB, VOX, new Date(now + 3 * 60_000 + 1000)).verdict).toBe("unlicensed");
    expect(evaluateLicense(key, PUB, { product: "MUEDsp", scope: "masterchain" }).verdict).toBe("reject");
  });

  it("★the key is in no response and no log line — the recipient gets it from their portal", async () => {
    const res = await post(GOOD);
    const text = await res.text();
    const key = String(dbState.inserted[0].licenseKey);
    const signature = key.match(/^sig=(.+)$/m)![1];
    const logged = JSON.stringify([log.warn.mock.calls, log.error.mock.calls, log.info.mock.calls]);
    for (const surface of [text, logged]) {
      expect(surface).not.toContain(signature);
      expect(surface).not.toContain("MUEDSP-LICENSE");
    }
    expect(JSON.parse(text).grant).toEqual({
      id: "grant-row-1", email: "tester@example.com", productId: "muedsp_vox", orderRef: dbState.inserted[0].orderRef,
      issuedAt: expect.any(String), expiresAt: expect.any(String), reason: GOOD.reason, grantedBy: KIMNY,
    });
    expect(logged).not.toContain("tester@example.com"); // the log names the order ref, not the person
    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  it("★masterchain (2026-10-15): a masterchain-scoped key that expires — accepted by masterchain until then, never by MUEDvox", async () => {
    const MC = { product: "MUEDsp", scope: "masterchain" };
    await post({ ...GOOD, product: "masterchain", days: undefined, minutes: 3 });
    const [row] = dbState.inserted;
    expect(row).toMatchObject({ productId: "muedsp_masterchain" });
    expect(String(row.orderRef)).toMatch(/^grant-masterchain-[0-9a-f-]{36}$/);
    const key = String(row.licenseKey);
    const now = Date.now();
    expect(evaluateLicense(key, PUB, MC, new Date(now + 2 * 60_000)).verdict).toBe("accept");
    expect(evaluateLicense(key, PUB, MC, new Date(now + 3 * 60_000 + 1000)).verdict).toBe("unlicensed");
    expect(evaluateLicense(key, PUB, VOX).verdict).toBe("reject");
    // ★The same cap as MUEDvox (conductor 2026-10-15).
    expect((await post({ ...GOOD, product: "masterchain", days: MAX_GRANT_MINUTES / 1440 + 1 })).status).toBe(400);
  });

  it("an extension is another grant: a second, different key with its own order ref", async () => {
    await post(GOOD);
    await post({ ...GOOD, days: 30, reason: "extension: sent a review" });
    expect(dbState.inserted).toHaveLength(2);
    expect(dbState.inserted[0].orderRef).not.toBe(dbState.inserted[1].orderRef);
    expect(dbState.inserted[0].licenseKey).not.toBe(dbState.inserted[1].licenseKey);
  });
});

describe("★what is refused", () => {
  it.each([
    ["no email", { ...GOOD, email: "" }, /email/],
    ["two addresses", { ...GOOD, email: "a@example.com, b@example.com" }, /email/],
    ["a newline in the address (would inject a line into the signed file)", { ...GOOD, email: "a@example.com\nexpires_at=" }, /email/],
    ["an unknown product", { ...GOOD, product: "muedlim" }, /product/],
    ["no period", { ...GOOD, days: undefined }, /exactly one/],
    ["both days and minutes", { ...GOOD, minutes: 5 }, /exactly one/],
    ["zero days", { ...GOOD, days: 0 }, /between/],
    ["a negative period", { ...GOOD, days: -1 }, /between/],
    ["half a day", { ...GOOD, days: 0.5 }, /whole number/],
    ["true as a period (CCO #1276)", { ...GOOD, days: true }, /whole number/],
    ["an array as a period", { ...GOOD, days: [5] }, /whole number/],
    ["a hex string as a period", { ...GOOD, days: "0x10" }, /whole number/],
    ["longer than the cap", { ...GOOD, days: MAX_GRANT_MINUTES / 1440 + 1 }, /between/],
    ["no reason", { ...GOOD, reason: " " }, /reason/],
    ["a reason with a line break", { ...GOOD, reason: "tester\nsecond line" }, /reason/],
  ])("%s → 400, nothing signed", async (_label, body, message) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(message);
    expect(dbState.inserted).toEqual([]);
  });

  it("a body that is not JSON → 400", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("the cap itself is accepted (90 days), and one minute is the shortest", () => {
    expect(parseGrantRequest({ ...GOOD, days: 90 })).toMatchObject({ ok: true, value: { minutes: MAX_GRANT_MINUTES } });
    expect(parseGrantRequest({ ...GOOD, days: undefined, minutes: 1 })).toMatchObject({ ok: true, value: { minutes: 1 } });
  });

  it("★no signing key → 500 and no row (never a row without a key)", async () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    const res = await post(GOOD);
    expect(res.status).toBe(500);
    expect(dbState.inserted).toEqual([]);
    expect(signGrant({ email: "t@example.com", product: PAID_PRODUCTS.muedvox, minutes: 5, reason: "x" })).toBeNull();
  });

  it("★the table is missing (migration 0064 not applied) → 500 with a plain message, and the key is not returned", async () => {
    dbState.fail = true;
    const res = await post(GOOD);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("no key was issued");
    expect(text).not.toContain("MUEDSP-LICENSE");
    expect(JSON.stringify(log.error.mock.calls)).toContain("0064");
  });
});

describe("the record of an address", () => {
  it("GET ?email= answers the records without the keys; no email → 400", async () => {
    dbState.rows = [{
      id: "g1", email: "tester@example.com", productId: "muedsp_vox", orderRef: "grant-muedvox-x",
      issuedAt: new Date("2026-10-13T14:00:00Z"), expiresAt: new Date("2026-10-27T14:00:00Z"), reason: "beta tester", grantedBy: KIMNY,
    }];
    const res = await get("?email=Tester%40Example.com");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ grants: [{
      id: "g1", email: "tester@example.com", productId: "muedsp_vox", orderRef: "grant-muedvox-x",
      issuedAt: "2026-10-13T14:00:00.000Z", expiresAt: "2026-10-27T14:00:00.000Z", reason: "beta tester", grantedBy: KIMNY,
    }] });
    expect((await get("")).status).toBe(400);
  });
});

describe("★the migration and the schema describe the same table", () => {
  it("every column of the Drizzle table is in 0064, and nothing else is created or altered there", () => {
    const sql = readFileSync("db/migrations/0064_plugin_license_grants.sql", "utf8");
    const statements = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    for (const column of ["id", "email", "product_id", "order_ref", "license_key", "license_version", "issued_at", "expires_at", "reason", "granted_by", "created_at"]) {
      expect(statements).toMatch(new RegExp(`^\\s+${column} `, "m"));
    }
    expect(statements.match(/CREATE TABLE/g)).toHaveLength(1);
    expect(statements).not.toMatch(/ALTER TABLE|DROP |DELETE |UPDATE |masterchain_/i);
  });
});
