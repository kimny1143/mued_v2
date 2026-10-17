import { afterEach, describe, expect, it, vi } from "vitest";

const KEY = "MUEDSP-LICENSE-v2\nowner=trial@gmail.com\nexpires_at=2026-10-13T00:30:00Z\nsig=test\n";
const URL = "https://mued.jp/downloads/test.pkg";
const PORTAL = "https://mued.jp/dashboard/plugins";

async function service(url: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://mued.jp");
  vi.doMock("@/lib/masterchain/config", () => ({ MASTERCHAIN_DOWNLOAD_URL: url }));
  return import("@/lib/services/email.service");
}
afterEach(() => vi.unstubAllEnvs());

describe("masterchain trial email — portal-only keys", () => {
  it.each(["ja", "en"] as const)("sends routes, UTC expiry and bypass behavior without keys or attachments (%s)", async (locale) => {
    for (const url of [URL, ""]) {
      const { emailTemplates, emailService } = await service(url);
      // Legacy runtime fields are ignored; the template/send signatures no longer accept a key.
      const data = { locale, licenseKey: KEY, expiresAt: "2026-10-14T01:30:00+09:00" };
      const mail = emailTemplates.masterchainTrialDelivery(data);
      const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
      await emailService.sendMasterchainTrialDelivery({ email: "trial@gmail.com" }, data);
      expect(send).toHaveBeenCalledExactlyOnceWith({
        to: { email: "trial@gmail.com" }, ...mail,
        tags: [{ name: "type", value: "masterchain_trial_delivery" }],
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
        expect(surface).toContain("2026-10-13 16:30 UTC");
        // ★1.0.3 (dsp 3a977b86): after the trial it runs as the demo — no "DEMO EXPIRED" screen, no "bypass".
        expect(surface).toContain(locale === "ja" ? "ライセンスキーを入れるまでデモとして動きます。45 秒ごとに約 3 秒" : "runs as the demo until you enter a license key: every 45 seconds");
        expect(surface).not.toContain("DEMO EXPIRED");
        expect(surface).not.toMatch(/bypass|バイパス/i);
        expect(surface).not.toMatch(/mute|silent|無音|unsubscribe|utm_|ご購入|Thank you for buying/i);
        if (url) expect(surface).toContain(URL);
        else {
          expect(surface).not.toContain(URL);
          expect(surface).toContain(locale === "ja" ? "返信" : "reply");
        }
      }
      expect(mail.html).toContain(`href="${PORTAL}"`);
      expect(mail.html).not.toMatch(/href="\s*"/);
      if (url) expect(mail.html).toContain(`href="${URL}"`);
    }
  });
});
