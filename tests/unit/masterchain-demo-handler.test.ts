// @vitest-environment node
import { readFileSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MUEDSP_AUDIENCE_ID } from "@/lib/plugins/registry";
import { MASTERCHAIN_DOWNLOAD_URL, MASTERCHAIN_WINDOWS_URL } from "@/lib/masterchain/config";

const m = vi.hoisted(() => ({ live: true, windows: true, create: vi.fn(), get: vi.fn(), send: vi.fn(), ip: vi.fn(), emailLimit: vi.fn(), error: vi.fn(), alert: vi.fn() }));
vi.mock("@/lib/masterchain/config", async (original) => ({
  ...await original<typeof import("@/lib/masterchain/config")>(),
  get MASTERCHAIN_DEMO_LIVE() { return m.live; },
  get MASTERCHAIN_WINDOWS_LIVE() { return m.windows; },
}));
vi.mock("resend", () => ({ Resend: class { contacts = { create: m.create, get: m.get }; } }));
vi.mock("@/lib/services/email.service", () => ({ emailService: { sendMasterchainDemoDownload: m.send, isConfigured: () => true, sendAdminAlert: m.alert } }));
vi.mock("@/lib/middleware/rate-limit", () => ({ rateLimit: m.ip, checkRateLimit: m.emailLimit }));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: m.error } }));
vi.mock("@/db", () => { throw new Error("Demo must not import DB"); });
vi.mock("@/lib/plugins/entitlements", () => { throw new Error("Demo must not record ownership"); });
import { handleMasterchainDemo, handlePaidDemo, type DemoProduct } from "@/lib/masterchain/demo-handler";

function request(body: unknown = { email: "person@example.com" }) {
  return new NextRequest("https://mued.jp/api/masterchain/demo", { method: "POST", body: JSON.stringify(body) });
}
// ★masterchain for Windows is live (2026-10-01): the response also carries the Windows zip.
const success = { ok: true, downloadUrl: MASTERCHAIN_DOWNLOAD_URL, windowsDownloadUrl: MASTERCHAIN_WINDOWS_URL };
beforeEach(() => {
  m.windows = true;
  m.live = true;
  vi.stubEnv("RESEND_API_KEY", "test");
  m.ip.mockResolvedValue(null);
  m.emailLimit.mockResolvedValue(null);
  m.create.mockResolvedValue({ data: { id: "contact" }, error: null });
  m.get.mockResolvedValue({ data: null, error: { statusCode: 404, name: "not_found", message: "Contact not found" } }); // Resend's measured "no such contact" (2026-10-04)
  m.send.mockResolvedValue({ success: true });
  m.alert.mockResolvedValue({ success: true });
  vi.stubEnv("OPERATOR_ALERT_EMAIL", "ops@example.com");
});
afterEach(() => vi.unstubAllEnvs());

describe("masterchain demo", () => {
  it("closed flag returns 404 without any side effects", async () => {
    m.live = false;
    const res = await handleMasterchainDemo(request());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_available" });
    for (const fn of [m.ip, m.emailLimit, m.create, m.send]) expect(fn).not.toHaveBeenCalled();
  });
  it.each([{ email: "bad" }, { email: "person@example.com", marketingOptIn: "true" }, { email: "person@example.com", locale: "fr" }])("rejects invalid body %j", async (body) => {
    const res = await handleMasterchainDemo(request(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_email" });
    expect(m.send).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const res = await handleMasterchainDemo(new NextRequest("https://mued.jp/api/masterchain/demo", { method: "POST", body: "{" }));
    expect(res.status).toBe(400);
  });
  it("rejects disposable addresses without sending or adding", async () => {
    const res = await handleMasterchainDemo(request({ email: "bot@mailinator.com", marketingOptIn: true }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "disposable_email" });
    expect(m.create).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
  });
  it.each([false, undefined])("adds to the audience and sends an unsubscribe-enabled receipt with legacy value %s", async (marketingOptIn) => {
    const res = await handleMasterchainDemo(request({ email: " Person@Example.com ", marketingOptIn }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(success);
    expect(m.create).toHaveBeenCalledExactlyOnceWith({ audienceId: MUEDSP_AUDIENCE_ID, email: "person@example.com", unsubscribed: false });
    expect(m.send).toHaveBeenCalledExactlyOnceWith({ email: "person@example.com" }, { locale: "en", marketingOptIn: true });
    expect(m.emailLimit).toHaveBeenCalledWith("plugin-email", "plugin-email:person@example.com");
    expect(m.ip).toHaveBeenCalledWith(expect.any(NextRequest), "research");
  });
  it("adds subscribers only to the shared MUEDsp audience", async () => {
    await handleMasterchainDemo(request({ email: "person@example.com", locale: "ja", marketingOptIn: true }));
    expect(m.create).toHaveBeenCalledExactlyOnceWith({ audienceId: MUEDSP_AUDIENCE_ID, email: "person@example.com", unsubscribed: false });
    // ★The server enables marketing on the receipt, which then carries the unsubscribe link (conductor 2026-09-30).
    expect(m.send).toHaveBeenCalledExactlyOnceWith({ email: "person@example.com" }, { locale: "ja", marketingOptIn: true });
  });
  it.each(["rejection", "throw", "unset"])("list failure %s is best-effort", async (mode) => {
    if (mode === "rejection") m.create.mockResolvedValue({ error: { message: "rejected" } });
    if (mode === "throw") m.create.mockRejectedValue(new Error("offline"));
    if (mode === "unset") vi.stubEnv("RESEND_API_KEY", "");
    const res = await handleMasterchainDemo(request({ email: "person@example.com", marketingOptIn: true }));
    expect(await res.json()).toEqual(success);
    expect(m.send).toHaveBeenCalledTimes(1);
    if (mode === "unset") expect(m.create).not.toHaveBeenCalled();
    else expect(m.error).toHaveBeenCalled();
    // ★(2) conductor 2026-09-30: a subscriber who did not reach the list alerts the operator (configured only).
    if (mode === "unset") expect(m.alert).not.toHaveBeenCalled();
    else expect(m.alert).toHaveBeenCalledTimes(1);
  });
  it.each(["ip", "email"])("returns 429 for %s rate limiting", async (kind) => {
    if (kind === "ip") m.ip.mockResolvedValue(NextResponse.json({}, { status: 429 }));
    else m.emailLimit.mockResolvedValue({ success: false });
    const res = await handleMasterchainDemo(request());
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(m.send).not.toHaveBeenCalled();
    expect(m.create).not.toHaveBeenCalled();
  });
  it("fails open if email rate limiting throws", async () => {
    m.emailLimit.mockRejectedValue(new Error("offline"));
    expect(await (await handleMasterchainDemo(request())).json()).toEqual(success);
  });
  it.each(["rejection", "throw"])("receipt %s does not block the download", async (mode) => {
    if (mode === "rejection") m.send.mockResolvedValue({ success: false, error: "rejected" });
    else m.send.mockRejectedValue(new Error("offline"));
    expect(await (await handleMasterchainDemo(request())).json()).toEqual(success);
    expect(m.send).toHaveBeenCalledTimes(1);
    expect(m.error).toHaveBeenCalled();
  });
  it("honeypot returns identical success without email or list side effects", async () => {
    const res = await handleMasterchainDemo(request({ email: "person@example.com", website: "bot", marketingOptIn: true }));
    expect(await res.json()).toEqual(success);
    expect(m.send).not.toHaveBeenCalled();
    expect(m.create).not.toHaveBeenCalled();
    expect(m.emailLimit).not.toHaveBeenCalled();
  });
  it("has no DB, entitlement, purchase or trial imports", () => {
    const source = readFileSync("lib/masterchain/demo-handler.ts", "utf8");
    const imports = source.match(/^import .*$/gm)?.join("\n");
    expect(imports).not.toMatch(/(?:@\/db|database|entitlement|trial|purchase|repository)/i);
  });
});

it("does not alert when the subscriber reached the list", async () => {
  m.create.mockResolvedValue({ data: { id: "contact" }, error: null });
  await handleMasterchainDemo(request({ email: "person@example.com", marketingOptIn: true }));
  expect(m.alert).not.toHaveBeenCalled();
});

it("★with masterchain for Windows off, the response is exactly the Mac-only one it was before", async () => {
  m.windows = false;
  const res = await handleMasterchainDemo(request());
  expect(await res.json()).toEqual({ ok: true, downloadUrl: MASTERCHAIN_DOWNLOAD_URL });
});

describe("an existing contact is never touched (CCO #1221)", () => {
  it.each([true, false])("already on the list (unsubscribed: %s) → no create, no alert, the receipt still goes", async (unsubscribed) => {
    m.get.mockResolvedValue({ data: { id: "c1", email: "person@example.com", unsubscribed }, error: null });
    const res = await handleMasterchainDemo(request({ email: "person@example.com" }));
    expect(await res.json()).toEqual(success);
    expect(m.get).toHaveBeenCalledExactlyOnceWith({ audienceId: MUEDSP_AUDIENCE_ID, email: "person@example.com" });
    expect(m.create).not.toHaveBeenCalled();
    expect(m.alert).not.toHaveBeenCalled();
    expect(m.send).toHaveBeenCalledTimes(1);
  });
  it("a lookup error other than not_found → no create (never risk re-subscribing), logged + alerted", async () => {
    m.get.mockResolvedValue({ data: null, error: { statusCode: 500, name: "internal_server_error", message: "boom" } });
    await handleMasterchainDemo(request({ email: "person@example.com" }));
    expect(m.create).not.toHaveBeenCalled();
    expect(m.error).toHaveBeenCalled();
    expect(m.alert).toHaveBeenCalledTimes(1);
  });
});

describe("★the demo entrance takes its product (C9 PR-C) — nothing of masterchain's leaks into another product's demo", () => {
  const receipt = vi.fn();
  const other = (over: Partial<DemoProduct> = {}): DemoProduct => ({
    tag: "other/demo", live: true, downloadUrl: "https://mued.jp/downloads/Other-1.0.0-installer.pkg", windowsUrl: null, sendReceipt: receipt, ...over,
  });
  beforeEach(() => { receipt.mockReset(); receipt.mockResolvedValue({ success: true }); });

  it("★its own flag closes it — 404 and no side effects — while masterchain's demo is open", async () => {
    const res = await handlePaidDemo(request(), other({ live: false }));
    expect(res.status).toBe(404);
    for (const fn of [m.ip, m.emailLimit, m.create, m.send, receipt]) expect(fn).not.toHaveBeenCalled();
    expect((await handleMasterchainDemo(request())).status).toBe(200); // positive control: the other flag is not this one
  });

  it("★answers with its own installer and sends its own receipt — not masterchain's URL, not masterchain's mail", async () => {
    const res = await handlePaidDemo(request({ email: "person@example.com", locale: "ja" }), other());
    expect(await res.json()).toEqual({ ok: true, downloadUrl: "https://mued.jp/downloads/Other-1.0.0-installer.pkg" });
    expect(receipt).toHaveBeenCalledExactlyOnceWith("person@example.com", "ja");
    expect(m.send).not.toHaveBeenCalled();
    // The list is the one shared MUEDsp list (kimny 8/27: one audience for the whole family).
    expect(m.create).toHaveBeenCalledExactlyOnceWith({ audienceId: MUEDSP_AUDIENCE_ID, email: "person@example.com", unsubscribed: false });
  });

  it("carries its Windows link only when it has one, and names itself in the operator's log", async () => {
    const res = await handlePaidDemo(request(), other({ windowsUrl: "https://mued.jp/downloads/Other-1.0.0-win-x64.zip" }));
    expect(await res.json()).toMatchObject({ windowsDownloadUrl: "https://mued.jp/downloads/Other-1.0.0-win-x64.zip" });
    receipt.mockResolvedValue({ success: false, error: "boom" });
    await handlePaidDemo(request(), other());
    expect(m.error).toHaveBeenCalledWith("[other/demo] receipt failed", { error: "boom" });
  });
});
