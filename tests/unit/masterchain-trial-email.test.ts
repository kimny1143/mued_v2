import { describe, expect, it, vi } from "vitest";

const KEY = "MUEDSP-LICENSE-v2\nowner=trial@gmail.com\nexpires_at=2026-10-13T00:30:00Z\nsig=test\n";
const URL = "https://mued.jp/downloads/test.pkg";

async function service(url: string) {
  vi.resetModules();
  vi.doMock("@/lib/masterchain/config", () => ({ MASTERCHAIN_DOWNLOAD_URL: url }));
  return import("@/lib/services/email.service");
}

describe("masterchain trial delivery", () => {
  it.each(["ja", "en"] as const)("delivers the key, instructions, UTC expiry and bypass behavior (%s)", async (locale) => {
    const { emailTemplates } = await service(URL);
    // Positive timezone offset crosses a UTC date boundary.
    const mail = emailTemplates.masterchainTrialDelivery({ locale, licenseKey: KEY, expiresAt: "2026-10-14T01:30:00+09:00" });
    for (const surface of [mail.html, mail.text]) {
      expect(surface).toContain(URL);
      expect(surface).toContain(KEY);
      // Date AND time in UTC (CCO #1145): 01:30+09:00 is 16:30 the previous day in UTC.
      expect(surface).toContain("2026-10-13 16:30 UTC");
      expect(surface).toContain("Demo expired");
      expect(surface).toContain(locale === "ja" ? "バイパス" : "bypass");
      expect(surface).toContain(locale === "ja" ? "音声は加工されずに通過" : "audio through unprocessed");
      expect(surface).toContain(locale === "ja" ? "新しいライセンスキーを入力するまで" : "until you enter a license key");
      const instructions = surface.slice(0, surface.indexOf(KEY));
      expect(instructions).toContain("MUEDSP-LICENSE-v2");
      expect(instructions).toContain("sig=");
      expect(instructions).toContain("~/Library/Application Support/glasswerks/MUEDsp/license.key");
      expect(surface).not.toMatch(/unsubscribe|utm_|ご購入|Thank you for buying/i);
    }
  });
  it.each(["ja", "en"] as const)("degrades honestly without a download URL (%s)", async (locale) => {
    const { emailTemplates } = await service("");
    const mail = emailTemplates.masterchainTrialDelivery({ locale, licenseKey: KEY, expiresAt: "2026-10-13T00:00:00Z" });
    expect(mail.html).not.toContain('href=""');
    expect(mail.text).not.toContain("https://");
    for (const surface of [mail.html, mail.text]) {
      expect(surface).toContain(locale === "ja" ? "返信" : "reply");
      expect(surface).toContain(KEY);
    }
  });
  it("escapes license owner markup in HTML without changing the plain-text key", async () => {
    const { emailTemplates } = await service(URL);
    const key = KEY.replace("trial@gmail.com", "<tag>@example.com");
    const mail = emailTemplates.masterchainTrialDelivery({ locale: "en", licenseKey: key, expiresAt: "2026-10-13T00:00:00Z" });
    expect(mail.html).toContain("&lt;tag&gt;@example.com");
    expect(mail.html).not.toContain("<tag>");
    expect(mail.text).toContain(key);
  });
  it("sends with the transactional trial tag", async () => {
    const { emailService } = await service(URL);
    const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
    await emailService.sendMasterchainTrialDelivery({ email: "trial@gmail.com" }, { locale: "en", licenseKey: KEY, expiresAt: "2026-10-13T00:00:00Z" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: { email: "trial@gmail.com" }, tags: [{ name: "type", value: "masterchain_trial_delivery" }],
      text: expect.stringContaining(KEY),
    }));
  });
  it.each(["ja", "en"] as const)("purchase email always explains replacing a trial key (%s)", async (locale) => {
    for (const url of [URL, ""]) {
      const { emailTemplates } = await service(url);
      const mail = emailTemplates.masterchainLicenseDelivery({ locale, licenseKey: KEY });
      for (const surface of [mail.html, mail.text]) {
        expect(surface).toContain(locale === "ja"
          ? "試用キーをお使いの場合は、このキーを貼り付けると置き換わります。"
          : "If you were using a trial key, pasting this key replaces it.");
      }
    }
  });
});
