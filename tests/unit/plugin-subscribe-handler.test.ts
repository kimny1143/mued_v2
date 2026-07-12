/**
 * Unit — handlePluginSubscribe honest-delivery behavior (lib/plugins/subscribe-handler.ts).
 *
 * The regression this locks: the welcome email carries the download link (= the deliverable), so a
 * send failure MUST surface (non-200), never a false "sent". Audience-add failure does NOT fail the
 * request (the user still got their download) but fires an operator alert so the lead loss is visible.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const mockAdd = vi.fn();
const mockEnabled = vi.fn();
vi.mock("@/lib/plugins/audience", () => ({
  addPluginSubscriber: (...a: unknown[]) => mockAdd(...a),
  isPluginAudienceEnabled: (...a: unknown[]) => mockEnabled(...a),
}));

const mockSendLim = vi.fn();
const mockSendSat = vi.fn();
const mockAlert = vi.fn();
vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    isConfigured: () => true,
    sendMuedlimDownloadWelcome: (...a: unknown[]) => mockSendLim(...a),
    sendMuedsatDownloadWelcome: (...a: unknown[]) => mockSendSat(...a),
    sendAdminAlert: (...a: unknown[]) => mockAlert(...a),
  },
}));

import { handlePluginSubscribe } from "@/lib/plugins/subscribe-handler";
import type { NextRequest } from "next/server";

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockResolvedValue(null); // rate-limit passes
  mockEnabled.mockReturnValue(true); // audience configured
  mockAdd.mockResolvedValue(true); // lead captured
  mockSendLim.mockResolvedValue({ success: true, messageId: "m1" });
  mockSendSat.mockResolvedValue({ success: true, messageId: "m2" });
  mockAlert.mockResolvedValue(undefined);
  process.env.OPERATOR_ALERT_EMAIL = "ops@mued.jp";
});

describe("handlePluginSubscribe — honest delivery", () => {
  it("happy path → 200 subscribed:true (email sent, list captured, no alert)", async () => {
    const res = await handlePluginSubscribe("muedlim", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.subscribed).toBe(true);
    expect(mockSendLim).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("email send FAILS → 502 EMAIL_DELIVERY_FAILED (no fake success)", async () => {
    mockSendLim.mockResolvedValue({ success: false, error: "resend down" });
    const res = await handlePluginSubscribe("muedlim", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe("EMAIL_DELIVERY_FAILED");
  });

  it("email throws → 502 (swallowed into an honest failure)", async () => {
    mockSendLim.mockRejectedValue(new Error("network"));
    const res = await handlePluginSubscribe("muedlim", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(502);
  });

  it("audience add fails but email OK → 200 (user got their download) + operator alert fired", async () => {
    mockEnabled.mockReturnValue(true);
    mockAdd.mockResolvedValue(false); // configured but failed = lead loss
    const res = await handlePluginSubscribe("muedlim", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it("staged (audience unconfigured) → email still delivered → 200, NO alert (expected no-op)", async () => {
    mockEnabled.mockReturnValue(false);
    mockAdd.mockResolvedValue(false); // no-op
    const res = await handlePluginSubscribe("muedlim", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("invalid email → 400 validation before any side effect", async () => {
    const res = await handlePluginSubscribe("muedlim", req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockSendLim).not.toHaveBeenCalled();
  });

  it("routes muedsat to its own welcome email (no cross-send)", async () => {
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "ja" }));
    expect(res.status).toBe(200);
    expect(mockSendSat).toHaveBeenCalledTimes(1);
    expect(mockSendLim).not.toHaveBeenCalled();
  });
});
