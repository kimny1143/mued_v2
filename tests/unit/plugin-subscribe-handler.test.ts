/**
 * Unit — handlePluginSubscribe honest-delivery behavior (lib/plugins/subscribe-handler.ts).
 *
 * The regression this locks: the welcome email carries the download link (= the deliverable), so a
 * send failure MUST surface (non-200), never a false "sent". Audience-add failure does NOT fail the
 * request (the user still got their download) but fires an operator alert so the lead loss is visible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRateLimit = vi.fn();
const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const mockAdd = vi.fn();
const mockEnabled = vi.fn();
vi.mock("@/lib/plugins/audience", () => ({
  addPluginSubscriber: (...a: unknown[]) => mockAdd(...a),
  isPluginAudienceEnabled: (...a: unknown[]) => mockEnabled(...a),
}));

// Portal entitlement recorder (P-1) — mocked so the handler test never touches @/db. Its wiring
// contract: recorded on a served download (200), NOT on failed delivery, and a record failure never
// breaks the 200 (best-effort / fail-open).
const mockRecord = vi.fn();
vi.mock("@/lib/plugins/entitlements", () => ({
  recordPluginEntitlement: (...a: unknown[]) => mockRecord(...a),
}));

const mockSendLim = vi.fn();
const mockSendSat = vi.fn();
const mockSendDrive = vi.fn();
const mockAlert = vi.fn();
vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    isConfigured: () => true,
    sendMuedlimDownloadWelcome: (...a: unknown[]) => mockSendLim(...a),
    sendMuedsatDownloadWelcome: (...a: unknown[]) => mockSendSat(...a),
    sendMuedriveDownloadWelcome: (...a: unknown[]) => mockSendDrive(...a),
    sendAdminAlert: (...a: unknown[]) => mockAlert(...a),
  },
}));

// Mock the registry so these tests control `live` independent of the real MUEDLIM_LIVE flag (which
// flips as MUEDlim is closed/reopened) — muedsat stays live for the honest-delivery cases, muedlim is
// forced not-live for the closed-plugin gate case. Keeps the suite stable across close/reopen PRs.
vi.mock("@/lib/plugins/registry", () => ({
  PLUGIN_DIST: {
    muedsat: { key: "muedsat", live: true, source: "muedsat_lp", downloadUrl: "", pressToken: "", i18nNamespace: "muedsat", subscribeEndpoint: "/api/muedsat/subscribe", audienceEnvName: "RESEND_MUEDSAT_AUDIENCE_ID" },
    muedrive: { key: "muedrive", live: true, source: "muedrive_lp" },
    muedlim: { key: "muedlim", live: false, source: "muedlim_lp", downloadUrl: "", pressToken: "", i18nNamespace: "muedlim", subscribeEndpoint: "/api/muedlim/subscribe", audienceEnvName: "RESEND_MUEDLIM_AUDIENCE_ID" },
  },
  HONEYPOT_FIELD: "contact_ref",
  isHoneypotTripped: (v: unknown) => typeof v === "string" && v.trim().length > 0,
}));

import { PLUGIN_DIST } from "@/lib/plugins/registry";
import { logger } from "@/lib/utils/logger";
import { handlePluginSubscribe } from "@/lib/plugins/subscribe-handler";
import type { NextRequest } from "next/server";

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockResolvedValue(null); // IP rate-limit passes
  mockCheckRateLimit.mockResolvedValue(null); // per-email rate-limit unconfigured (fail-open) by default
  mockEnabled.mockReturnValue(true); // audience configured
  mockAdd.mockResolvedValue(true); // lead captured
  mockSendDrive.mockResolvedValue({ success: true, messageId: "m3" });
  mockSendLim.mockResolvedValue({ success: true, messageId: "m1" });
  mockSendSat.mockResolvedValue({ success: true, messageId: "m2" });
  mockAlert.mockResolvedValue(undefined);
  mockRecord.mockResolvedValue(true); // portal entitlement recorded
  process.env.OPERATOR_ALERT_EMAIL = "ops@mued.jp";
});

describe("handlePluginSubscribe — honest delivery", () => {
  // Honest-delivery behavior is plugin-agnostic — tested with a LIVE plugin (muedsat). MUEDlim is
  // closed (registry.live=false, 2026-07-13) so it exercises the not-live gate below instead.
  it("happy path (live plugin) → 200 subscribed:true (email sent, list captured, no alert)", async () => {
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en", marketingOptIn: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.subscribed).toBe(true);
    expect(mockSendSat).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("email send FAILS → 502 EMAIL_DELIVERY_FAILED (no fake success)", async () => {
    mockSendSat.mockResolvedValue({ success: false, error: "resend down" });
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe("EMAIL_DELIVERY_FAILED");
  });

  it("email throws → 502 (swallowed into an honest failure)", async () => {
    mockSendSat.mockRejectedValue(new Error("network"));
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(502);
  });

  it("audience add fails but email OK → 200 (user got their download) + operator alert fired", async () => {
    mockEnabled.mockReturnValue(true);
    mockAdd.mockResolvedValue(false); // configured but failed = lead loss
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en", marketingOptIn: true }));
    expect(res.status).toBe(200);
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it("staged (audience unconfigured) → email still delivered → 200, NO alert (expected no-op)", async () => {
    mockEnabled.mockReturnValue(false);
    mockAdd.mockResolvedValue(false); // no-op
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en", marketingOptIn: true }));
    expect(res.status).toBe(200);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("invalid email → 400 validation before any side effect", async () => {
    const res = await handlePluginSubscribe("muedsat", req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockSendSat).not.toHaveBeenCalled();
  });

  it("closed plugin (registry.live=false, e.g. MUEDlim) → 200 subscribed:false, no capture, no email", async () => {
    // MUEDlim is closed to "coming soon" (MUEDLIM_LIVE=false) — the gate no-ops before any side effect.
    const res = await handlePluginSubscribe("muedlim", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.subscribed).toBe(false);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockSendLim).not.toHaveBeenCalled();
  });
});

describe("handlePluginSubscribe — portal entitlement wiring (P-1)", () => {
  it("happy path records the entitlement once (plugin + email + source) after a served download", async () => {
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      "muedsat",
      expect.objectContaining({ email: "a@b.com", source: "muedsat_lp" }),
    );
  });

  it("does NOT record when delivery FAILS (502) — the row means 'download served', not 'submitted'", async () => {
    mockSendSat.mockResolvedValue({ success: false, error: "resend down" });
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(502);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("record failure NEVER breaks the response (fail-open) — a throw still returns 200 subscribed:true", async () => {
    mockRecord.mockRejectedValue(new Error("db down"));
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.subscribed).toBe(true);
  });

  it("closed plugin records nothing (gate no-ops before the recorder)", async () => {
    const res = await handlePluginSubscribe("muedlim", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("carries submitted utm_* as firstTouch (attribution parity with 0050/0057)", async () => {
    await handlePluginSubscribe(
      "muedsat",
      req({ email: "a@b.com", locale: "en", utm_source: "threads", utm_campaign: "launch" }),
    );
    expect(mockRecord).toHaveBeenCalledWith(
      "muedsat",
      expect.objectContaining({
        firstTouch: expect.objectContaining({ utmSource: "threads", utmCampaign: "launch" }),
      }),
    );
  });

  it("firstTouch is null when no utm_* is submitted (no empty-object noise)", async () => {
    await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(mockRecord).toHaveBeenCalledWith("muedsat", expect.objectContaining({ firstTouch: null }));
  });
});

describe("handlePluginSubscribe — bot defense (honeypot + per-email rate limit, 2026-07-16)", () => {
  it("honeypot filled → silent no-op 200 subscribed:false, NO email, NO quota spent (bot can't tell)", async () => {
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en", contact_ref: "http://spam" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Byte-identical shape to the not-live no-op so a bot can't distinguish a block from success.
    expect(json.data.subscribed).toBe(false);
    expect(mockSendSat).not.toHaveBeenCalled(); // no welcome email = no quota burn
    expect(mockAdd).not.toHaveBeenCalled();
    // warn, not info: info is a no-op in production, and a real user caught here left no trace (2026-10-24).
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("honeypot tripped"), expect.anything());
  });

  it("empty honeypot → normal path (regression 0 for real users)", async () => {
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en", contact_ref: "" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.subscribed).toBe(true);
    expect(mockSendSat).toHaveBeenCalledTimes(1);
  });

  it("per-email rate limit exceeded → 429 RATE_LIMITED, honest error, NO welcome resent", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: Date.now() + 1000 });
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe("RATE_LIMITED"); // form maps this to its generic "try again" error, never a false "sent"
    expect(mockSendSat).not.toHaveBeenCalled();
  });

  it("per-email limiter THROWS (Upstash blip) → fail-OPEN, welcome still delivered (① review fix)", async () => {
    // The exact launch-wave failure mode: high load makes limiter.limit() throw. The .catch(()=>null)
    // must swallow it so the deliverable still ships — never fail-CLOSED on the scenario we defend.
    mockCheckRateLimit.mockRejectedValue(new Error("upstash 429"));
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.subscribed).toBe(true);
    expect(mockSendSat).toHaveBeenCalledTimes(1);
  });

  it("honeypot check runs BEFORE the per-email limiter (bot never consumes a real user's limit budget)", async () => {
    const res = await handlePluginSubscribe("muedsat", req({ email: "a@b.com", locale: "en", contact_ref: "x" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.subscribed).toBe(false);
    expect(mockCheckRateLimit).not.toHaveBeenCalled(); // short-circuited by honeypot
  });
});


describe.each([
  ["muedsat", mockSendSat],
  ["muedlim", mockSendLim],
  ["muedrive", mockSendDrive],
] as const)("%s notice-based subscription", (plugin, send) => {
  beforeEach(() => { PLUGIN_DIST.muedlim.live = true; });
  afterEach(() => { PLUGIN_DIST.muedlim.live = false; });

  it.each([undefined, false, true])("ignores legacy client value %s: captures audience and enables news with unsubscribe", async (marketingOptIn) => {
    const body = { email: "a@b.com", locale: "ja", ...(marketingOptIn === undefined ? {} : { marketingOptIn }) };
    const res = await handlePluginSubscribe(plugin, req(body));
    expect(res.status).toBe(200);
    expect((await res.json()).data.subscribed).toBe(true);
    expect(send).toHaveBeenCalledExactlyOnceWith({ email: "a@b.com" }, { locale: "ja", marketingOptIn: true });
    expect(mockRecord).toHaveBeenCalledExactlyOnceWith(plugin, {
      email: "a@b.com", source: `${plugin}_lp`, firstTouch: null, locale: "ja",
    });
    expect(mockAdd).toHaveBeenCalledExactlyOnceWith(plugin, { email: "a@b.com", locale: "ja" });
    expect(mockEnabled).toHaveBeenCalledWith(plugin);
    expect(mockAlert).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each(["true", "false", 1, null, {}, []])("rejects non-boolean legacy field %j before side effects", async (marketingOptIn) => {
    const res = await handlePluginSubscribe(plugin, req({ email: "a@b.com", marketingOptIn }));
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockSendSat).not.toHaveBeenCalled();
    expect(mockSendLim).not.toHaveBeenCalled();
    expect(mockSendDrive).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
