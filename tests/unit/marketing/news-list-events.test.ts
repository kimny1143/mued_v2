/**
 * news_list_events recorder (0066): best-effort, never throws, logs no email; the migration and the schema agree.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { values, insert, error } = vi.hoisted(() => {
  const values = vi.fn(async () => undefined);
  return { values, insert: vi.fn(() => ({ values })), error: vi.fn() };
});
vi.mock("@/db", () => ({ db: { insert } }));
vi.mock("@/lib/utils/logger", () => ({ logger: { error, warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { checkboxStatus, recordNewsListEvent } from "@/lib/marketing/news-list-events";
import { newsListEvents } from "@/db/schema";
import { withdrawnEmails } from "@/scripts/import-resend-withdrawn-20261030";

beforeEach(() => vi.clearAllMocks());

describe("recordNewsListEvent", () => {
  it("writes one row, email lower-cased, occurred_at = now by default", async () => {
    const before = Date.now();
    await expect(recordNewsListEvent({ email: " A@B.com ", status: "granted", surface: "download", productKey: "muedsat", source: "muedsat_lp", locale: "ja" })).resolves.toBe(true);
    expect(insert).toHaveBeenCalledWith(newsListEvents);
    const row = (values.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(row).toMatchObject({ email: "a@b.com", status: "granted", surface: "download", productKey: "muedsat", source: "muedsat_lp", locale: "ja" });
    expect((row.occurredAt as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("occurred_at null stays null — 'not known' (resend_footer, import)", async () => {
    await recordNewsListEvent({ email: "a@b.com", status: "withdrawn", surface: "resend_footer", occurredAt: null });
    expect(((values.mock.calls[0] as unknown[])[0] as Record<string, unknown>).occurredAt).toBeNull();
  });

  it("never throws; a failed insert is false and the log carries no email", async () => {
    values.mockRejectedValueOnce(new Error("relation \"news_list_events\" does not exist"));
    await expect(recordNewsListEvent({ email: "secret@example.com", status: "granted", surface: "demo" })).resolves.toBe(false);
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(error.mock.calls)).not.toContain("secret@example.com");
    await expect(recordNewsListEvent({ email: "  ", status: "granted", surface: "demo" })).resolves.toBe(false);
  });

  it("only `true` is consent", () => {
    expect(checkboxStatus(true)).toBe("granted");
    for (const v of [false, undefined, null, "true", 1]) expect(checkboxStatus(v)).toBe("not_granted");
  });
});

describe("0066 migration ↔ schema", () => {
  const sql = readFileSync(join(process.cwd(), "db/migrations/0066_news_list_events.sql"), "utf8");
  it("is pure additive: one CREATE TABLE IF NOT EXISTS, no ALTER / DROP / UPDATE / DELETE", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS news_list_events/);
    // statements only (comment lines start with --)
    expect(sql).not.toMatch(/^\s*(ALTER|DROP|UPDATE|DELETE|TRUNCATE)\b/im);
  });
  it("every schema column is created by the migration, and the CHECK lists match the TS types", () => {
    for (const col of ["id", "email", "status", "surface", "product_key", "source", "locale", "occurred_at", "recorded_at"]) {
      expect(sql).toMatch(new RegExp(`\\n\\s*${col} `));
    }
    expect(sql).toContain("CHECK (status IN ('granted', 'not_granted', 'withdrawn'))");
    expect(sql).toContain("CHECK (surface IN ('download', 'demo', 'cart', 'unsubscribe_link', 'resend_footer', 'import'))");
    expect(Object.keys(newsListEvents)).toEqual(expect.arrayContaining(["email", "status", "surface", "occurredAt", "recordedAt"]));
  });
});

describe("import-resend-withdrawn-20261030 — which rows it takes", () => {
  it("only unsubscribed=true, lower-cased, de-duplicated; quoted fields parse", () => {
    const csv = [
      "id,email,first_name,last_name,created_at,unsubscribed,segments",
      'c1,A@Example.com,,,2026-07-12,true,MUEDsp',
      'c2,b@example.com,"Doe, J",,2026-07-13,false,MUEDsp',
      'c3,a@example.com,,,2026-07-14,true,"MUEDsp|General"',
      'c4,c@example.com,"say ""hi""",,2026-07-15,true,General',
    ].join("\n");
    expect(withdrawnEmails(csv)).toEqual(["a@example.com", "c@example.com"]);
  });
  it("refuses a file without the columns it needs", () => {
    expect(() => withdrawnEmails("id,mail\nc1,a@b.c")).toThrow(/no email/);
  });
});
