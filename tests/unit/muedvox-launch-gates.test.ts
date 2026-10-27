// @vitest-environment node
/**
 * MUEDvox's launch wiring, checked before any flag is on (conductor 2026-10-13: prepare everything that does
 * not depend on the release files). While the flags are off this file holds: (1) the flags can only be turned on
 * in a combination that works, (2) the Buy button and the demo form have every word they read, (3) the demo
 * entrance and the two mails say MUEDvox's own things, and nothing of it is reachable yet.
 */
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import enVox from "@/messages/muedvox.en.json";
import jaVox from "@/messages/muedvox.ja.json";
import * as config from "@/lib/muedvox/config";
import { PAID_PRODUCTS } from "@/lib/plugins/paid-products";
import { SHORT_LINKS } from "@/lib/short-links/table";

const real = () => ({
  live: config.MUEDVOX_LIVE, purchaseLive: config.MUEDVOX_PURCHASE_LIVE, demoLive: config.MUEDVOX_DEMO_LIVE,
  downloadUrl: config.MUEDVOX_DOWNLOAD_URL, windowsUrl: config.MUEDVOX_WINDOWS_URL, windowsVersion: config.MUEDVOX_WINDOWS_VERSION,
  screenshot: config.MUEDVOX_SCREENSHOT, productEnabled: PAID_PRODUCTS.muedvox.enabled,
});
const LAUNCHED = {
  live: true, purchaseLive: true, demoLive: true, downloadUrl: "https://mued.jp/downloads/MUEDvox-1.0.0-installer.pkg",
  windowsUrl: "https://mued.jp/downloads/MUEDvox-1.0.0-win-x64-00000000.zip", windowsVersion: "1.0.0",
  screenshot: "/muedvox/screen.webp", productEnabled: true,
};

describe("★the flags can only be on in a combination that works", () => {
  it("the real configuration is consistent, and it is the launched one (2026-10-13; 1.1.0 since 2026-10-20)", () => {
    expect(config.muedvoxLaunchProblems(real())).toEqual([]);
    expect(real()).toEqual({
      live: true, purchaseLive: true, demoLive: true, productEnabled: true,
      downloadUrl: "https://mued.jp/downloads/MUEDvox-1.1.0-installer.pkg",
      windowsUrl: "https://mued.jp/downloads/MUEDvox-1.1.0-win-x64-0580272a.zip", windowsVersion: "1.1.0",
      screenshot: "/muedvox/MUEDvox-1.1.0-harmony.webp",
    });
  });

  it("positive control: the full launch state is accepted, and so is 'enabled + deployed, store not yet published'", () => {
    expect(config.muedvoxLaunchProblems(LAUNCHED)).toEqual([]);
    expect(config.muedvoxLaunchProblems({ ...LAUNCHED, live: false, purchaseLive: false, demoLive: false })).toEqual([]);
  });

  it.each([
    ["Buy without the page", { live: false }, /PURCHASE_LIVE needs LIVE/],
    ["Buy while the webhook would issue no key", { productEnabled: false }, /paid and get no key/],
    ["Buy with no installer", { downloadUrl: "", windowsUrl: "", windowsVersion: "" }, /PURCHASE_LIVE needs MUEDVOX_DOWNLOAD_URL/],
    ["Buy with no screen image for the cart", { screenshot: "" }, /MUEDVOX_SCREENSHOT/],
    ["demo with no installer", { purchaseLive: false, productEnabled: false, downloadUrl: "", windowsUrl: "", windowsVersion: "" }, /DEMO_LIVE needs MUEDVOX_DOWNLOAD_URL/],
    ["demo without the page", { live: false, purchaseLive: false }, /DEMO_LIVE needs LIVE/],
    ["demo while buying is closed (the receipt says 'buy from the product page')", { purchaseLive: false }, /DEMO_LIVE needs PURCHASE_LIVE/],
    ["a Windows URL without its version", { windowsVersion: "" }, /set together/],
    ["a Windows zip without the Mac installer", { live: false, purchaseLive: false, demoLive: false, productEnabled: false, downloadUrl: "" }, /Windows zip without the Mac installer/],
  ] as const)("refuses: %s", (_name, change, message) => {
    expect(config.muedvoxLaunchProblems({ ...LAUNCHED, ...change }).join("\n")).toMatch(message);
  });
});

describe("★the Buy button and the demo form have every word they read", () => {
  // The keys each component reads from its namespace, taken from masterchain's own namespaces — the components
  // are the same code (#1263, #1266), so a key masterchain has and MUEDvox lacks would render as a raw key.
  const cartKeys = ["signInNote", "thanks", "thanksPortal", "orderProduct", "orderFormats", "orderPrice", "orderTaxNote", "orderTaxIncluded",
    "orderTaxAdded", "orderPriceLoading", "orderKeyNote", "cartTitle", "cartTotal", "cartEula", "agreeAndContinue", "cartNextScreen",
    "cartAudienceNote", "checkoutLoading", "modalClose"];
  const used = (file: string, fn: string) => [...readFileSync(file, "utf8").matchAll(new RegExp(`\\b${fn}\\(["\`]([A-Za-z.]+)`, "g"))].map((m) => m[1]);

  it.each([["ja", jaVox, ja], ["en", enVox, en]] as const)("%s: muedvox.cart covers what PaidBuyButton reads", (_l, vox, main) => {
    // `tb(...)` is the cart's namespace inside the modal; the three outside it are read as `t(...)` by the button
    // itself (in the modal `t` is the EULA's namespace, so `t` cannot be searched for).
    const read = new Set([...used("components/features/muedsp-landing/masterchain-buy-button.tsx", "tb"), "thanks", "thanksPortal", "signInNote"]);
    expect(read.size).toBeGreaterThanOrEqual(15); // the search found the calls (not vacuous)
    for (const key of read) expect(Object.keys(vox.cart), `muedvox.cart.${key}`).toContain(key);
    expect(Object.keys(vox.cart).sort()).toEqual([...cartKeys].sort());
    // Same words as masterchain's cart except the product line and its formats.
    const mc = main.muedsp.buyTry as Record<string, string>;
    for (const key of cartKeys.filter((k) => k !== "orderProduct" && k !== "orderFormats")) expect((vox.cart as Record<string, string>)[key], key).toBe(mc[key]);
    expect(vox.cart.orderProduct).toBe("MUEDvox");
    expect(vox.cart.orderFormats).toMatch(/AU · VST3 · AAX/);
    expect(vox.cart.orderFormats).toMatch(/Windows · VST3/);
    expect(vox.cart.orderPrice).toBe("$69");
  });

  it.each([["ja", jaVox, ja], ["en", enVox, en]] as const)("%s: muedvox.demoForm covers what PaidDemoForm reads", (_l, vox, main) => {
    const file = "components/features/muedsp-landing/masterchain-try.tsx";
    const read = [...used(file, "t"), ...used(file, "td"), ...used(file, "twin")];
    expect(read.length).toBeGreaterThanOrEqual(6);
    const form = vox.demoForm as Record<string, unknown>;
    for (const key of read) expect(Object.keys(form), `muedvox.demoForm.${key}`).toContain(key.split(".")[0]);
    // ★The WHOLE namespace is pinned (CCO #1272: only three fields were, so a new or rewritten sentence here passed —
    //   and tests/unit/muedvox-client-messages.test.ts leaves this namespace out of its "not in the main file"
    //   population on the strength of this test). Exactly these keys; every value is masterchain's public one,
    //   except the two that are MUEDvox's own: the button and the note (which is the page's demo sentence).
    const { buyTry, demo, windows } = main.muedsp;
    expect(form).toEqual({
      try: vox.demoForm.try,
      emailLabel: buyTry.emailLabel,
      emailPlaceholder: buyTry.emailPlaceholder,
      demoNote: vox.demo.body,
      emailNotice: demo.emailNotice,
      consent: demo.consent,
      success: demo.success,
      errors: demo.errors,
      demoChoose: windows.demoChoose,
      demoOtherMac: windows.demoOtherMac,
      demoOtherWindows: windows.demoOtherWindows,
    });
    expect(vox.demoForm.try).toMatch(/MUEDvox/);
  });

  it("ja and en carry the same keys", () => {
    const keys = (o: unknown, pre = ""): string[] => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => keys(v, `${pre}${k}.`)) : [pre]);
    expect(keys(jaVox).sort()).toEqual(keys(enVox).sort());
  });
});

describe("★the modes are 1.0.0's: Render / Track / Live (mued-vox docs/product-facts-1.0.md)", () => {
  it.each([["ja", jaVox], ["en", enVox]] as const)("%s: three rows with the measured latencies; no 'Track Short'; Live's 3 ms is not sold as tracking speed", (_l, vox) => {
    expect(Object.keys(vox.modes).filter((k) => typeof (vox.modes as Record<string, unknown>)[k] === "object")).toEqual(["render", "track", "live"]);
    expect([vox.modes.render.name, vox.modes.track.name, vox.modes.live.name]).toEqual(["Render", "Track", "Live"]);
    expect(vox.modes.render.latency).toMatch(/0\.94/);
    expect(vox.modes.track.latency).toMatch(/0\.34/);
    expect(vox.modes.live.latency).toBe("3 ms");
    expect(JSON.stringify(vox)).not.toMatch(/Track Short/);
    // The note says what the 3 ms is — the value reported to the host — and that chord following takes longer.
    expect(vox.modes.note).toMatch(/DAW/);
    const page = readFileSync("components/features/muedvox-landing/muedvox-landing-content.tsx", "utf8");
    expect(page).toContain('(["render", "track", "live"] as const)');
  });
});

describe("★the demo entrance and the mails — MUEDvox's own, and shut until its flag and its installer exist", () => {
  const m = vi.hoisted(() => ({ live: false, url: "", win: "", send: vi.fn(), create: vi.fn(), get: vi.fn(), record: vi.fn(async () => true) }));
  beforeEach(() => {
    vi.resetModules();
    m.live = false; m.url = ""; m.win = "";
    m.send.mockReset(); m.send.mockResolvedValue({ success: true });
    m.create.mockReset(); m.create.mockResolvedValue({ data: { id: "c" }, error: null });
    m.get.mockReset(); m.get.mockResolvedValue({ data: null, error: { statusCode: 404, name: "not_found", message: "Contact not found" } });
    vi.doMock("@/lib/muedvox/config", async (original) => ({
      ...await original<typeof import("@/lib/muedvox/config")>(),
      get MUEDVOX_DEMO_LIVE() { return m.live; }, get MUEDVOX_DOWNLOAD_URL() { return m.url; }, get MUEDVOX_WINDOWS_URL() { return m.win; },
    }));
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://mued.jp");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.doUnmock("@/lib/muedvox/config"); vi.doUnmock("@/lib/services/email.service"); vi.doUnmock("resend"); vi.doUnmock("@/lib/middleware/rate-limit"); vi.doUnmock("@/lib/masterchain/demo-signups"); });

  async function post() {
    vi.doMock("resend", () => ({ Resend: class { contacts = { create: m.create, get: m.get }; } }));
    vi.doMock("@/lib/middleware/rate-limit", () => ({ rateLimit: async () => null, checkRateLimit: async () => null }));
    vi.doMock("@/lib/services/email.service", () => ({ emailService: { sendMuedvoxDemoDownload: m.send, sendMasterchainDemoDownload: vi.fn(), isConfigured: () => true, sendAdminAlert: vi.fn() } }));
    // The sign-up record (0065) goes to the DB; a unit test never writes one.
    vi.doMock("@/lib/masterchain/demo-signups", () => ({ recordDemoSignup: m.record }));
    vi.stubEnv("RESEND_API_KEY", "test");
    const { POST } = await import("@/app/api/muedvox/demo/route");
    return POST(new NextRequest("https://mued.jp/api/muedvox/demo", { method: "POST", body: JSON.stringify({ email: "person@example.com", locale: "ja" }) }));
  }

  it("★today's configuration (launched 2026-10-13): the route answers the real installer and the real Windows zip", async () => {
    vi.doUnmock("@/lib/muedvox/config");
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true, downloadUrl: "https://mued.jp/downloads/MUEDvox-1.1.0-installer.pkg",
      windowsDownloadUrl: "https://mued.jp/downloads/MUEDvox-1.1.0-win-x64-0580272a.zip",
    });
    expect(m.send).toHaveBeenCalledTimes(1);
    // ★Recorded under MUEDvox's own key, not masterchain's (0065).
    expect(m.record).toHaveBeenCalledWith(expect.objectContaining({ productKey: "muedvox", source: "muedvox_lp", email: "person@example.com", locale: "ja" }));
  });

  it("★the flag off: 404 and touches nothing, whatever the URLs say (the state before launch, and the way to close it)", async () => {
    m.url = LAUNCHED.downloadUrl; m.win = LAUNCHED.windowsUrl;
    const res = await post();
    expect(res.status).toBe(404);
    expect(m.send).not.toHaveBeenCalled();
    expect(m.create).not.toHaveBeenCalled();
  });

  it("★the flag alone does not open it: no installer URL → still 404 (a download of nothing is not a demo)", async () => {
    m.live = true;
    expect((await post()).status).toBe(404);
    expect(m.send).not.toHaveBeenCalled();
  });

  it("open: answers MUEDvox's installer (+ the Windows zip when there is one) and sends MUEDvox's receipt", async () => {
    m.live = true; m.url = LAUNCHED.downloadUrl; m.win = LAUNCHED.windowsUrl;
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, downloadUrl: LAUNCHED.downloadUrl, windowsDownloadUrl: LAUNCHED.windowsUrl });
    // Not ticked: the receipt goes, without news (kimny 2026-10-28 「B」).
    expect(m.send).toHaveBeenCalledExactlyOnceWith({ email: "person@example.com" }, { locale: "ja", marketingOptIn: false });
  });

  it.each(["ja", "en"] as const)("the demo receipt (%s): MUEDvox's name, both links named for their OS, the product-page short link, a way off the list", async (locale) => {
    m.url = LAUNCHED.downloadUrl; m.win = LAUNCHED.windowsUrl;
    const { emailTemplates, emailService } = await import("@/lib/services/email.service");
    const mail = emailTemplates.muedvoxDemoDownload({ locale, unsubscribeUrl: "https://mued.jp/api/plugins/unsubscribe?x=1" });
    for (const surface of [mail.html, mail.text]) {
      expect(surface).toContain(LAUNCHED.downloadUrl);
      expect(surface).toContain(LAUNCHED.windowsUrl);
      expect(surface).toContain(locale === "ja" ? "Mac 版のデモをダウンロード" : "Download the demo for Mac");
      expect(surface).toContain(locale === "ja" ? "Windows 版のデモをダウンロード" : "Download the demo for Windows");
      expect(surface).toContain("https://mued.jp/l/vox-demo-mail");
      expect(surface).toContain((locale === "ja" ? jaVox : enVox).formats.windowsNote);
      // ★What 1.0.1's demo really does (mued-vox #213; conductor's wording 2026-10-15): the harmony drops out for
      //   about 3 s every 45 s while the lead keeps playing — never "passes audio through unprocessed" (masterchain's
      //   sentence) — and the session survives a license. 1.0.0's "insert again" / "not saved" lines are gone.
      expect(surface).toContain(locale === "ja" ? "45 秒ごとにハモリが 3 秒ほど抜けます（歌は鳴り続けます）" : "every 45 seconds the harmony drops out for about 3 seconds (your lead keeps playing)");
      expect(surface).toContain(locale === "ja" ? "ライセンスを入れた後もそのまま開けます" : "sessions made in the demo open unchanged");
      expect(surface).not.toMatch(/挿し直す|保存されません|insert it again|aren't saved/);
      expect(surface).not.toMatch(/unprocessed|原音のまま/);
      expect(surface).toContain(locale === "ja" ? "プラグインの中の Buy MUEDvox からも開けます" : "Buy MUEDvox inside the plugin opens it too");
      expect(surface).not.toMatch(/masterchain/i); // nothing of the other product's mail
      expect(surface).toContain("unsubscribe?x=1");
    }
    expect(mail.subject).toBe(locale === "ja" ? "MUEDvox デモのダウンロード" : "Your MUEDvox demo download");
    // With the checkbox ticked the person is on the list, so the send carries the one-click header.
    const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
    vi.stubEnv("PLUGIN_UNSUBSCRIBE_TOKEN_SECRET", "test-secret");
    await emailService.sendMuedvoxDemoDownload({ email: "person@example.com" }, { locale, marketingOptIn: true });
    const sent = send.mock.calls[0][0] as { headers?: Record<string, string>; tags?: { value: string }[] };
    expect(sent.headers?.["List-Unsubscribe"]).toMatch(/^<https:\/\/.+>$/);
    // ★The scope must be one the unsubscribe route accepts AND that withdraws from the shared MUEDsp list — the
    //   list the demo adds to. That scope is named "masterchain" (app/api/plugins/unsubscribe/route.ts); any other
    //   name would make a link the route rejects (CCO #1272).
    expect(sent.headers?.["List-Unsubscribe"]).toContain("/api/plugins/unsubscribe?plugin=masterchain&");
    const route = readFileSync("app/api/plugins/unsubscribe/route.ts", "utf8");
    expect(route).toMatch(/scope === "masterchain"\s*\?\s*unsubscribeMuedspContact\(email\)/);
    expect(sent.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent.tags?.[0].value).toBe("muedvox_demo_download");
    // Not ticked: on no list — no header, no unsubscribe link, no product-page pitch; the download links stay.
    await emailService.sendMuedvoxDemoDownload({ email: "person@example.com" }, { locale });
    const plain = send.mock.calls[1][0] as { headers?: Record<string, string>; html: string; text: string };
    expect(plain.headers).toBeUndefined();
    for (const surface of [plain.html, plain.text]) {
      expect(surface).toContain(LAUNCHED.downloadUrl);
      expect(surface).not.toContain("/api/plugins/unsubscribe");
      expect(surface).not.toContain("https://mued.jp/l/vox-demo-mail");
    }
    send.mockRestore();
  });

  it("the short link in the receipt exists and lands on MUEDvox's page", () => {
    const row = SHORT_LINKS.find((r) => r.slug === "vox-demo-mail");
    expect(row).toMatchObject({ host: "mued.jp", path: "/en/muedvox", utmSource: "email", utmCampaign: "muedvox_demo_mail" });
  });

  it("★the two links baked into the 1.0.0 binary exist under the names VOX was given (a slug never changes once shipped)", () => {
    const row = (slug: string) => SHORT_LINKS.find((r) => r.slug === slug);
    expect(row("vox-plugin")).toMatchObject({ host: "mued.jp", path: "/en/muedvox", utmSource: "muedsp_plugin", utmMedium: "inapp", localeFromBrowser: true });
    expect(row("vox-portal")).toMatchObject({ host: "mued.jp", path: "/dashboard/plugins", utmSource: "muedsp_plugin", utmMedium: "inapp" });
  });

  it.each([["ja", jaVox], ["en", enVox]] as const)("%s: the page says the same thing about the demo as the mail — the harmony drops out, the lead keeps playing", (_l, vox) => {
    for (const text of [vox.demo.body, vox.demoForm.demoNote, vox.faq.items.find((i) => i.id === "demo")!.answer]) {
      expect(text).toMatch(/45/);
      expect(text).not.toMatch(/unprocessed|原音のまま/);
      expect(text).toMatch(/ハモリが 3 秒ほど抜けます（歌は鳴り続けます）|the harmony drops out for about 3 seconds \(your lead keeps playing\)/);
      expect(text).toMatch(/そのまま開けます|open unchanged/);
      expect(text).not.toMatch(/挿し直す|保存されません|insert it again|saved with your session/);
    }
  });

  it.each([["ja", jaVox], ["en", enVox]] as const)("%s: the FAQ keeps the preset line narrow — the plug-in's own menu, not the DAW's presets (VOX 2026-10-15)", (_l, vox) => {
    const faq = vox.faq.items.find((i) => i.id === "demo")!.answer;
    expect(faq).toMatch(/DAW/);
    expect(faq).toMatch(/プリセットメニュー|preset menu/);
  });

  it.each(["ja", "en"] as const)("the purchase mail (%s): with a Windows zip, a link for each OS; without one, the mail as it was", async (locale) => {
    m.url = LAUNCHED.downloadUrl; m.win = LAUNCHED.windowsUrl;
    let { emailTemplates } = await import("@/lib/services/email.service");
    let mail = emailTemplates.muedvoxLicenseDelivery({ locale });
    for (const surface of [mail.html, mail.text]) {
      expect(surface).toContain(LAUNCHED.downloadUrl);
      expect(surface).toContain(LAUNCHED.windowsUrl);
      expect(surface).toContain(locale === "ja" ? "Windows 版の MUEDvox をダウンロード" : "Download MUEDvox for Windows");
      // ★The page, the demo receipt and the purchase mail say the same sentence about the unsigned zip.
      expect(surface).toContain((locale === "ja" ? jaVox : enVox).formats.windowsNote);
      expect(surface).toContain(locale === "ja" ? "Mac 版の MUEDvox をダウンロード" : "Download MUEDvox for Mac");
    }
    vi.resetModules();
    m.win = "";
    ({ emailTemplates } = await import("@/lib/services/email.service"));
    mail = emailTemplates.muedvoxLicenseDelivery({ locale });
    expect(mail.html).not.toContain("Windows 版の MUEDvox");
    expect(mail.html).not.toContain("for Windows");
    expect(mail.text).toContain(`${locale === "ja" ? "ダウンロード" : "Download"}: ${LAUNCHED.downloadUrl}`);
  });
});
