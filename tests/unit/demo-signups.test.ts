/**
 * Unit — recordDemoSignup (lib/masterchain/demo-signups.ts, 0065).
 *
 * The same contract as recordPluginEntitlement (tests/unit/plugin-entitlements.test.ts), which the handler test
 * cannot see because it mocks the recorder whole (CCO #1312): (1) one row, lower-cased email, ON CONFLICT
 * (email, product_key) DO NOTHING; (2) an empty email is a no-op; (3) a DB error is swallowed → false, never throws.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const logError = vi.fn();
vi.mock("@/lib/utils/logger", () => ({ logger: { error: (...a: unknown[]) => logError(...a), warn: vi.fn(), info: vi.fn() } }));

const mockOnConflict = vi.fn();
const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflict }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
vi.mock("@/db", () => ({ db: { insert: (...a: unknown[]) => mockInsert(...a) } }));
vi.mock("@/db/schema", () => ({ demoSignups: { email: "email_col", productKey: "product_col" } }));

import { recordDemoSignup } from "@/lib/masterchain/demo-signups";

const base = { productKey: "muedvox" as const, source: "muedvox_lp", locale: "ja" as const, firstTouch: null, audienceAdded: false };

beforeEach(() => {
  vi.clearAllMocks();
  mockOnConflict.mockResolvedValue(undefined);
});

describe("recordDemoSignup", () => {
  it("inserts one lower-cased row with onConflictDoNothing on (email, product_key) → true", async () => {
    const ok = await recordDemoSignup({ ...base, email: "  Person@Example.COM " });
    expect(ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith({
      email: "person@example.com",
      productKey: "muedvox",
      source: "muedvox_lp",
      locale: "ja",
      firstTouch: null,
      newsNoticeShown: true,
      audienceAdded: false,
    });
    expect(mockOnConflict).toHaveBeenCalledExactlyOnceWith({ target: ["email_col", "product_col"] });
  });

  it("passes firstTouch and audienceAdded through", async () => {
    await recordDemoSignup({ ...base, email: "a@b.co", firstTouch: { utmSource: "threads" }, audienceAdded: true });
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ firstTouch: { utmSource: "threads" }, audienceAdded: true }));
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
