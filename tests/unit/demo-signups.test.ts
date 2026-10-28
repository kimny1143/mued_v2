/**
 * Unit — recordDemoSignup (lib/masterchain/demo-signups.ts, 0065).
 *
 * The same contract as recordPluginEntitlement (tests/unit/plugin-entitlements.test.ts), which the handler test
 * cannot see because it mocks the recorder whole (CCO #1312): (1) one row, lower-cased email, ON CONFLICT
 * (email, product_key) DO UPDATE of the two consent columns only, by OR (they turn on, never off); (2) an empty email is a no-op; (3) a DB error is swallowed → false, never throws.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const logError = vi.fn();
vi.mock("@/lib/utils/logger", () => ({ logger: { error: (...a: unknown[]) => logError(...a), warn: vi.fn(), info: vi.fn() } }));

const mockOnConflict = vi.fn();
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflict }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
vi.mock("@/db", () => ({ db: { insert: (...a: unknown[]) => mockInsert(...a) } }));
vi.mock("@/db/schema", () => ({ demoSignups: { email: "email_col", productKey: "product_col", newsConsent: "news_consent_col", audienceAdded: "audience_added_col" } }));

import { recordDemoSignup } from "@/lib/masterchain/demo-signups";

const base = { productKey: "muedvox" as const, source: "muedvox_lp", locale: "ja" as const, firstTouch: null, newsConsent: false, audienceAdded: false };

beforeEach(() => {
  vi.clearAllMocks();
  mockOnConflict.mockResolvedValue(undefined);
});

describe("recordDemoSignup", () => {
  it("inserts one lower-cased row, upserting on (email, product_key) → true", async () => {
    const ok = await recordDemoSignup({ ...base, email: "  Person@Example.COM " });
    expect(ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith({
      email: "person@example.com",
      productKey: "muedvox",
      source: "muedvox_lp",
      locale: "ja",
      firstTouch: null,
      newsConsent: false,
      audienceAdded: false,
    });
    expect(mockOnConflict).toHaveBeenCalledTimes(1);
    expect(mockOnConflict.mock.calls[0][0].target).toEqual(["email_col", "product_col"]);
  });

  // CCO #1312: unticked first, ticked on the second try → the person is on the list, so the row must say so.
  //   The update touches ONLY the two consent columns, and only by OR with the existing value (true is never undone).
  it("★a repeat sign-up can only turn the consent columns on — OR with the stored value, nothing else updated", async () => {
    await recordDemoSignup({ ...base, email: "a@b.co", newsConsent: true, audienceAdded: true });
    const { set } = mockOnConflict.mock.calls[0][0] as { set: Record<string, { queryChunks: unknown[] }> };
    expect(Object.keys(set).sort()).toEqual(["audienceAdded", "newsConsent"]);
    const render = (chunk: { queryChunks: unknown[] }) =>
      chunk.queryChunks.map((c) => (typeof c === "string" ? c : (c as { value?: string[] }).value?.join("") ?? "")).join("");
    expect(render(set.newsConsent)).toBe("news_consent_col OR excluded.news_consent");
    expect(render(set.audienceAdded)).toBe("audience_added_col OR excluded.audience_added");
  });

  it("passes firstTouch, newsConsent and audienceAdded through", async () => {
    await recordDemoSignup({ ...base, email: "a@b.co", firstTouch: { utmSource: "threads" }, newsConsent: true, audienceAdded: true });
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ firstTouch: { utmSource: "threads" }, newsConsent: true, audienceAdded: true }));
  });

  it("★audience_added is never true without consent — the column means 'a consenting person is on the list'", async () => {
    await recordDemoSignup({ ...base, email: "a@b.co", newsConsent: false, audienceAdded: true });
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ newsConsent: false, audienceAdded: false }));
  });

  it("an empty email is a guarded no-op (no insert) → false", async () => {
    expect(await recordDemoSignup({ ...base, email: "   " })).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("swallows a DB error → false and logs it, never throws", async () => {
    mockOnConflict.mockRejectedValue(new Error("relation does not exist"));
    await expect(recordDemoSignup({ ...base, email: "a@b.co" })).resolves.toBe(false);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining("[demo-signups] record failed (muedvox)"), expect.anything());
  });
});
