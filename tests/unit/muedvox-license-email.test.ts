import { afterEach, describe, expect, it, vi } from "vitest";

const URL = "https://mued.jp/downloads/MUEDvox-1.0.0-installer.pkg";
afterEach(() => vi.unstubAllEnvs());

describe("MUEDvox purchase delivery", () => {
  it.each(["ja", "en"] as const)("honest subjects, formats and portal-only instructions (%s)", async (locale) => {
    for (const url of [URL, ""]) {
      vi.resetModules();
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://mued.jp");
      vi.doMock("@/lib/muedvox/config", () => ({ MUEDVOX_DOWNLOAD_URL: url, MUEDVOX_WINDOWS_URL: "" })); // no Windows zip here; muedvox-launch-gates covers the one with it
      const { emailTemplates, emailService } = await import("@/lib/services/email.service");
      const mail = emailTemplates.muedvoxLicenseDelivery({ locale });
      expect(mail.subject).toBe(url
        ? locale === "ja" ? "[MUEDsp] MUEDvox のダウンロードとライセンスの受け取り" : "[MUEDsp] Your MUEDvox download and how to get your license"
        : locale === "ja" ? "[MUEDsp] MUEDvox のライセンスはポータルで受け取れます" : "[MUEDsp] Your MUEDvox license is ready in your portal");
      for (const body of [mail.text, mail.html]) {
        expect(body).toContain("https://mued.jp/dashboard/plugins");
        expect(body).toContain(locale === "ja" ? "このメールアドレスでサインイン" : "sign in with this email address");
        expect(body).toContain(locale === "ja"
          ? "ポータルで鍵のファイル（.key）をダウンロードし、MUEDvox の画面にドラッグ&ドロップしてください。うまくいかない DAW では、「Load license file…」で選ぶか、キーをコピーして「Paste license key」を押してください。"
          : 'In the portal: download your key file (.key) and drag it onto MUEDvox. If drop doesn\'t work in your DAW, use "Load license file…", or copy the key and press "Paste license key".');
        expect(body).not.toMatch(/license\.key|masterchain|demo|デモ|MUEDSP-LICENSE|sig=|unsubscribe|utm_/i);
        if (url) {
          expect(body).toContain(URL);
          expect(body).toContain(locale === "ja" ? "macOS: AU・VST3・AAX。Windows: VST3。" : "macOS: AU, VST3 and AAX. Windows: VST3.");
        } else {
          expect(body).not.toContain(URL);
          expect(body).toContain(locale === "ja" ? "折り返しお送りします" : "I'll send the installer download link");
        }
      }
      expect(mail.html).not.toMatch(/href="\s*"/);
      const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
      await emailService.sendMuedvoxLicenseDelivery({ email: "buyer@example.com" }, { locale });
      expect(send).toHaveBeenCalledExactlyOnceWith({
        to: { email: "buyer@example.com" }, ...mail,
        tags: [{ name: "type", value: "muedvox_license_delivery" }],
      });
      expect(send.mock.calls[0][0]).not.toHaveProperty("attachments");
    }
  });
});
