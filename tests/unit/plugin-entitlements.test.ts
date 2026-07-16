/**
 * Unit — recordPluginEntitlement (lib/plugins/entitlements.ts), P-1 of the user portal.
 *
 * Locks the contract: (1) inserts one email-keyed ownership row with lower-cased email +
 * onConflictDoNothing (idempotent re-subscribe); (2) empty email is a guarded no-op (no insert);
 * (3) a DB error is swallowed → returns false, NEVER throws (best-effort / fail-open, so the subscribe
 * response is never affected).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const mockOnConflict = vi.fn();
const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflict }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
vi.mock("@/db", () => ({ db: { insert: (...a: unknown[]) => mockInsert(...a) } }));

// Schema table token — only its identity matters (the mocked db never reads it).
vi.mock("@/db/schema", () => ({ pluginEntitlements: { email: "email_col", pluginKey: "plugin_col" } }));

import { recordPluginEntitlement } from "@/lib/plugins/entitlements";

beforeEach(() => {
  vi.clearAllMocks();
  mockOnConflict.mockResolvedValue(undefined); // insert ok
});

describe("recordPluginEntitlement", () => {
  it("inserts one lower-cased, email-keyed row with onConflictDoNothing → true", async () => {
    const ok = await recordPluginEntitlement("muedsat", { email: "  A@B.CO ", source: "muedsat_lp" });
    expect(ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.co", pluginKey: "muedsat", source: "muedsat_lp", firstTouch: null }),
    );
    // idempotent: ON CONFLICT (email, plugin_key) DO NOTHING
    expect(mockOnConflict).toHaveBeenCalledTimes(1);
    expect(mockOnConflict).toHaveBeenCalledWith(
      expect.objectContaining({ target: ["email_col", "plugin_col"] }),
    );
  });

  it("passes firstTouch through when provided", async () => {
    await recordPluginEntitlement("muedlim", {
      email: "c@d.co",
      source: "muedlim_lp",
      firstTouch: { gaClientId: "GA1.1", utmSource: "threads" },
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstTouch: { gaClientId: "GA1.1", utmSource: "threads" } }),
    );
  });

  it("empty email is a guarded no-op (no insert) → false", async () => {
    const ok = await recordPluginEntitlement("muedsat", { email: "   ", source: "muedsat_lp" });
    expect(ok).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("swallows a DB error → false, never throws (best-effort / fail-open)", async () => {
    mockOnConflict.mockRejectedValue(new Error("neon down"));
    await expect(
      recordPluginEntitlement("muedsat", { email: "a@b.co", source: "muedsat_lp" }),
    ).resolves.toBe(false);
  });
});
