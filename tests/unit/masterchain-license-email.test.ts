import { afterEach, describe, expect, it, vi } from "vitest";

const KEY = "MUEDSP-LICENSE-v2\nowner=buyer@example.com\nsig=purchase-fixture\n";
const URL = "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-installer.pkg";
const PORTAL = "https://mued.jp/dashboard/plugins";

async function service(downloadUrl: string, appUrl: string | undefined = "https://mued.jp") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
  vi.doMock("@/lib/masterchain/config", () => ({ MASTERCHAIN_DOWNLOAD_URL: downloadUrl }));
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
