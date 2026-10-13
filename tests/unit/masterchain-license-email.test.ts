import { afterEach, describe, expect, it, vi } from "vitest";

const KEY = "MUEDSP-LICENSE-v2\nowner=buyer@example.com\nsig=purchase-fixture\n";
const URL = "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-installer.pkg";
const PORTAL = "https://mued.jp/dashboard/plugins";

async function service(downloadUrl: string, appUrl: string | undefined = "https://mued.jp") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
  // No Windows build in this fixture: the tests that need one pass `windowsUrl` (or read the real config).
  vi.doMock("@/lib/masterchain/config", () => ({
    MASTERCHAIN_DOWNLOAD_URL: downloadUrl, MASTERCHAIN_WINDOWS_LIVE: false, MASTERCHAIN_WINDOWS_URL: "", MASTERCHAIN_WINDOWS_VERSION: "",
  }));
  return import("@/lib/services/email.service");
}

afterEach(() => vi.unstubAllEnvs());

describe("masterchain purchase email — portal-only keys", () => {
  it.each(["ja", "en"] as const)("sends instructions without key text or attachments (%s)", async (locale) => {
    for (const url of [URL, ""]) {
      const { emailTemplates, emailService } = await service(url);
      // Even an older runtime caller supplying an extra field must not leak it into the email.
      const data = { locale, licenseKey: KEY };
      const mail = emailTemplates.masterchainLicenseDelivery(data);
      const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
      await emailService.sendMasterchainLicenseDelivery({ email: "buyer@example.com" }, data);
      expect(send).toHaveBeenCalledExactlyOnceWith({
        to: { email: "buyer@example.com" }, ...mail,
        tags: [{ name: "type", value: "masterchain_license_delivery" }],
      });
      expect(send.mock.calls[0][0]).not.toHaveProperty("attachments");
      for (const surface of [mail.html, mail.text]) {
        for (const forbidden of [KEY, "MUEDSP-LICENSE", "sig=", "Application Support", "~/Library", "<pre"])
          expect(surface).not.toContain(forbidden);
        expect(surface).toContain(PORTAL);
        expect(surface).toContain("Load license file…");
        expect(surface).toContain("Drop license.key here");
        expect(surface).toContain(locale === "ja" ? "ポータルで鍵のファイル（.key）をダウンロード" : "In the portal: download your key file (.key)");
        expect(surface).not.toMatch(/download license\.key|license\.key をダウンロード/i);
        expect(surface).toContain("Paste license key");
        expect(surface).not.toContain("Paste license from clipboard");
        expect(surface).toContain(locale === "ja" ? "このメールアドレスでサインイン" : "sign in with this email address");
        expect(surface).toContain(locale === "ja"
          ? "デモ版をお使いの場合は、入れ直しは要りません。今のプラグインに鍵を入れると、制限がなくなります。"
          : "If you've been using the demo, there's no need to reinstall. Load this license into the plug-in you already have and the limits are removed.");
        expect(surface).not.toMatch(/unsubscribe|utm_/i);
        if (url) {
          expect(surface).toContain(URL);
          expect(surface.indexOf(URL)).toBeLessThan(surface.indexOf(PORTAL));
        } else {
          expect(surface).not.toContain(URL);
          expect(surface).toContain(locale === "ja" ? "返信" : "reply");
        }
      }
      expect(mail.html).toContain(`href="${PORTAL}"`);
      expect(mail.html).not.toMatch(/href="\s*"/);
      if (url) expect(mail.html).toContain(`href="${URL}"`);
      expect(mail.subject).toBe(url
        ? locale === "ja" ? "[MUEDsp] masterchain のダウンロードとライセンスの受け取り" : "[MUEDsp] Your masterchain download and how to get your license"
        : locale === "ja" ? "[MUEDsp] masterchain のライセンスはポータルで受け取れます" : "[MUEDsp] Your masterchain license is ready in your portal");
      // ★The subject follows the body (#1007): the key is not in this mail, so the subject must not promise it.
      expect(mail.subject).not.toMatch(/license key|ライセンスキー/);
    }
  });

  it.each([undefined, "https://preview.example/"])("builds the portal link from the site URL with production fallback (%s)", async (appUrl) => {
    const { emailTemplates } = await service(URL, appUrl ?? "");
    const mail = emailTemplates.masterchainLicenseDelivery({ locale: "en" });
    const expected = appUrl ? "https://preview.example/dashboard/plugins" : PORTAL;
    expect(mail.html).toContain(`href="${expected}"`);
    expect(mail.text).toContain(expected);
  });
});

describe("★the Windows zip in the purchase email (conductor 2026-10-13) — a Windows buyer must not have to find it in the portal", () => {
  const WIN = "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-win-x64-a2678157.zip";

  it.each(["ja", "en"] as const)("with a Windows build: both links, each named for its OS, and the same-key line (%s)", async (locale) => {
    const { emailTemplates } = await service(URL);
    const mail = emailTemplates.masterchainLicenseDelivery({ locale, windowsUrl: WIN });
    const ja = locale === "ja";
    for (const surface of [mail.html, mail.text]) {
      expect(surface).toContain(URL);
      expect(surface).toContain(WIN);
      expect(surface).toContain(ja ? "Mac 版の masterchain をダウンロード" : "Download masterchain for Mac");
      expect(surface).toContain(ja ? "Windows 版の masterchain をダウンロード" : "Download masterchain for Windows");
      expect(surface).toContain(ja ? "Windows: VST3（64 bit）" : "Windows: VST3 (64-bit)");
      // The portal's own sentence (messages pluginPortal.windows.masterchainSameKey).
      expect(surface).toContain(ja ? "Windows 版（VST3）も、同じライセンスキーで使えます。" : "The Windows version (VST3) uses the same license key.");
      // ★"… · macOS" beside a Windows link read as a contradiction (CCO #1200): the Mac line says it is the Mac's.
      expect(surface).toContain("Mac: VST3 · AU · AAX (Pro Tools) · macOS");
    }
    // The key rules are untouched by the new link.
    expect(mail.html).toContain(PORTAL);
    expect(mail.html).not.toContain("MUEDSP-LICENSE");
  });

  it.each(["ja", "en"] as const)("★without a Windows build the mail is byte-for-byte what it was (%s)", async (locale) => {
    const { emailTemplates } = await service(URL);
    const mail = emailTemplates.masterchainLicenseDelivery({ locale, windowsUrl: null });
    expect(mail.html).not.toMatch(/Windows/);
    expect(mail.text).not.toMatch(/Windows/);
    expect(mail.html).toContain(locale === "ja" ? "masterchain をダウンロード" : "Download masterchain");
    expect(mail.html).not.toContain("Mac: VST3");
    expect(mail.text).toContain(`${locale === "ja" ? "ダウンロード" : "Download"}: ${URL}\nVST3 · AU · AAX (Pro Tools) · macOS`);
  });

  it("★no Mac link → no Windows link either: the degraded mail promises one link by reply, not half a download", async () => {
    const { emailTemplates } = await service("");
    const mail = emailTemplates.masterchainLicenseDelivery({ locale: "en", windowsUrl: WIN });
    expect(mail.html).not.toContain(WIN);
    expect(mail.text).not.toContain(WIN);
  });

  it("★by default the link follows what is actually offered — the live flag and URL in lib/masterchain/config.ts", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/masterchain/config");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://mued.jp");
    const config = await import("@/lib/masterchain/config");
    const { emailTemplates } = await import("@/lib/services/email.service");
    const mail = emailTemplates.masterchainLicenseDelivery({ locale: "en" });
    expect(config.MASTERCHAIN_WINDOWS_LIVE && !!config.MASTERCHAIN_WINDOWS_URL).toBe(true); // what is on sale today
    expect(mail.html).toContain(config.MASTERCHAIN_WINDOWS_URL);
    expect(mail.text).toContain(config.MASTERCHAIN_WINDOWS_URL);
  });
});
