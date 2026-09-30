import { describe, expect, it, vi } from "vitest";
import { emailService, emailTemplates } from "@/lib/services/email.service";
import { PLUGIN_DIST } from "@/lib/plugins/registry";

const cases = [
  { plugin: "muedsat", template: "muedsatDownloadWelcome", sender: "sendMuedsatDownloadWelcome" },
  { plugin: "muedlim", template: "muedlimDownloadWelcome", sender: "sendMuedlimDownloadWelcome" },
  { plugin: "muedrive", template: "muedriveDownloadWelcome", sender: "sendMuedriveDownloadWelcome" },
] as const;

function news(plugin: string, locale: "ja" | "en", format: "html" | "text") {
  if (plugin === "muedsat") {
    return locale === "ja"
      ? format === "html"
        ? "アップデートや MUEDsp masterchain の情報も、追ってお知らせします。"
        : "アップデートや MUEDsp masterchain の情報も追ってお知らせします。"
      : format === "html"
        ? "I'll also let you know about updates — and when MUEDsp masterchain is ready."
        : "I'll also let you know about updates and when MUEDsp masterchain is ready.";
  }
  return locale === "ja"
    ? "完成形の MUEDsp masterchain も、いま作っています。アップデートがあればお知らせします。"
    : "I'm still building the finished MUEDsp masterchain; I'll let you know when there's an update.";
}

describe.each(cases)("$plugin welcome consent", ({ plugin, template, sender }) => {
  describe.each(["ja", "en"] as const)("%s", (locale) => {
    it.each([undefined, false, true])("gates every news sentence with consent %s, preserving download and footer", async (marketingOptIn) => {
      const data = { locale, ...(marketingOptIn === undefined ? {} : { marketingOptIn }) };
      const unsubscribeUrl = "https://mued.jp/unsubscribe-test";
      const output = emailTemplates[template]({ ...data, unsubscribeUrl });
      const optedIn = emailTemplates[template]({ locale, marketingOptIn: true, unsubscribeUrl });
      const downloadUrl = PLUGIN_DIST[plugin].downloadUrl;
      expect(downloadUrl).not.toBe("");
      for (const format of ["html", "text"] as const) {
        expect(output[format].includes(news(plugin, locale, format))).toBe(marketingOptIn === true);
        expect(output[format]).toContain(downloadUrl);
        expect(output[format]).toContain(unsubscribeUrl);
        // Removing the consent-dependent sentence leaves all other wording intact.
        const normalize = (body: string) => body.replace(news(plugin, locale, format), "").replace(/<[^>]*>/g, "").replace(/\s+/g, "").trim();
        expect(normalize(output[format])).toBe(normalize(optedIn[format]));
      }
      if (plugin === "muedsat") {
        expect(output.html).toContain(locale === "ja"
          ? "僕の言葉より、あなた自身の耳で決めてください。"
          : "I'd rather you decide with your own ears than take my word for it.");
      }
      const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
      await emailService[sender]({ email: "listener@example.com" }, data);
      expect(send).toHaveBeenCalledTimes(1);
      const sent = send.mock.calls[0][0];
      for (const format of ["html", "text"] as const) {
        expect(sent[format]?.includes(news(plugin, locale, format))).toBe(marketingOptIn === true);
        expect(sent[format]).toContain(downloadUrl);
      }
      expect(sent.headers).toHaveProperty("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
    });
  });
});
