/**
 * Unit — handleMasterchainInterest (lib/masterchain/interest-handler.ts).
 *
 * Locks the C2 contract: (1) staged (MASTERCHAIN_INTEREST_LIVE=false) → benign no-op, nothing
 * recorded; (2) live → the interest DB record is transactional/ALWAYS (a failed insert surfaces as a
 * retryable 502 — it is the deliverable/denominator), while the Resend audience add is best-effort
 * (its failure never fails the request); (3) validation happens before any side effect.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let liveFlag = false;
vi.mock("@/lib/masterchain/config", () => ({
  get MASTERCHAIN_INTEREST_LIVE() {
    return liveFlag;
  },
}));

const mockRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const mockOnConflict = vi.fn();
const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflict }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
vi.mock("@/db", () => ({ db: { insert: (...a: unknown[]) => mockInsert(...a) } }));

const mockAdd = vi.fn();
const mockEnabled = vi.fn();
vi.mock("@/lib/masterchain/audience", () => ({
  addMasterchainContact: (...a: unknown[]) => mockAdd(...a),
  isMasterchainAudienceEnabled: (...a: unknown[]) => mockEnabled(...a),
}));

import { handleMasterchainInterest } from "@/lib/masterchain/interest-handler";
import type { NextRequest } from "next/server";

function req(body: unknown): NextRequest {
  return { json: async () => body, headers: new Headers() } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  liveFlag = false;
  mockRateLimit.mockResolvedValue(null); // rate-limit passes
  mockEnabled.mockReturnValue(true); // audience configured
  mockAdd.mockResolvedValue(true); // captured
  mockOnConflict.mockResolvedValue(undefined); // DB insert ok
});

describe("handleMasterchainInterest — staged (not live)", () => {
  it("no-ops (200 registered:false) — no DB insert, no audience add", async () => {
    const res = await handleMasterchainInterest(req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.registered).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });
});

describe("handleMasterchainInterest — live", () => {
  beforeEach(() => {
    liveFlag = true;
  });

  it("happy path → records interest + adds to audience → 200 registered:true", async () => {
    const res = await handleMasterchainInterest(req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.registered).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it("DB insert fails → 502 INTEREST_RECORD_FAILED (the record is the deliverable)", async () => {
    mockOnConflict.mockRejectedValue(new Error("db down"));
    const res = await handleMasterchainInterest(req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe("INTEREST_RECORD_FAILED");
  });

  it("audience add fails but DB ok → still 200 (best-effort, never fails the request)", async () => {
    mockAdd.mockResolvedValue(false);
    const res = await handleMasterchainInterest(req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.registered).toBe(true);
  });

  it("invalid email → 400 validation before any side effect", async () => {
    const res = await handleMasterchainInterest(req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rate-limited → returns the rate-limit response, no side effects", async () => {
    const limited = new Response("rate limited", { status: 429 });
    mockRateLimit.mockResolvedValue(limited);
    const res = await handleMasterchainInterest(req({ email: "a@b.com" }));
    expect(res.status).toBe(429);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
