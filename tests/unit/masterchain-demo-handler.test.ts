// @vitest-environment node
import { readFileSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MUEDSP_AUDIENCE_ID } from "@/lib/plugins/registry";
import { MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";

const m = vi.hoisted(() => ({ live: true, create: vi.fn(), send: vi.fn(), ip: vi.fn(), emailLimit: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/masterchain/config", async (original) => ({
  ...await original<typeof import("@/lib/masterchain/config")>(),
  get MASTERCHAIN_DEMO_LIVE() { return m.live; },
}));
vi.mock("resend", () => ({ Resend: class { contacts = { create: m.create }; } }));
vi.mock("@/lib/services/email.service", () => ({ emailService: { sendMasterchainDemoDownload: m.send } }));
vi.mock("@/lib/middleware/rate-limit", () => ({ rateLimit: m.ip, checkRateLimit: m.emailLimit }));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: m.error } }));
vi.mock("@/db", () => { throw new Error("Demo must not import DB"); });
vi.mock("@/lib/plugins/entitlements", () => { throw new Error("Demo must not record ownership"); });
import { handleMasterchainDemo } from "@/lib/masterchain/demo-handler";

function request(body: unknown = { email: "person@example.com" }) {
  return new NextRequest("https://mued.jp/api/masterchain/demo", { method: "POST", body: JSON.stringify(body) });
}
const success = { ok: true, downloadUrl: MASTERCHAIN_DOWNLOAD_URL };
beforeEach(() => {
  m.live = true;
  vi.stubEnv("RESEND_API_KEY", "test");
  m.ip.mockResolvedValue(null);
  m.emailLimit.mockResolvedValue(null);
  m.create.mockResolvedValue({ data: { id: "contact" }, error: null });
  m.send.mockResolvedValue({ success: true });
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
  it.each([false, undefined])("sends one receipt with no list access when consent is %s", async (marketingOptIn) => {
    const res = await handleMasterchainDemo(request({ email: " Person@Example.com ", marketingOptIn }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(success);
    expect(m.create).not.toHaveBeenCalled();
    expect(m.send).toHaveBeenCalledExactlyOnceWith({ email: "person@example.com" }, { locale: "en" });
    expect(m.emailLimit).toHaveBeenCalledWith("plugin-email", "plugin-email:person@example.com");
    expect(m.ip).toHaveBeenCalledWith(expect.any(NextRequest), "research");
  });
  it("adds consented contacts only to the shared MUEDsp audience", async () => {
    await handleMasterchainDemo(request({ email: "person@example.com", locale: "ja", marketingOptIn: true }));
    expect(m.create).toHaveBeenCalledExactlyOnceWith({ audienceId: MUEDSP_AUDIENCE_ID, email: "person@example.com", unsubscribed: false });
    expect(m.send).toHaveBeenCalledExactlyOnceWith({ email: "person@example.com" }, { locale: "ja" });
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
