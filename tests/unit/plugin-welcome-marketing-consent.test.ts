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

describe.each(cases)("$plugin notice-based welcome", ({ plugin, template, sender }) => {
  describe.each(["ja", "en"] as const)("%s", (locale) => {
    it("includes news, download and unsubscribe in every welcome sent by the handler", async () => {
      const marketingOptIn = true;
      const data = { locale, marketingOptIn };
      const unsubscribeUrl = "https://mued.jp/unsubscribe-test";
      const output = emailTemplates[template]({ ...data, unsubscribeUrl });
      const downloadUrl = PLUGIN_DIST[plugin].downloadUrl;
      expect(downloadUrl).not.toBe("");
      for (const format of ["html", "text"] as const) {
        expect(output[format].includes(news(plugin, locale, format))).toBe(true);
        expect(output[format]).toContain(downloadUrl);
        expect(output[format].includes('/dashboard/plugins')).toBe(true);
        expect(output[format].includes('/muedsp')).toBe(true);
        expect(output[format].includes(unsubscribeUrl)).toBe(true);
        const footer = locale === "en" ? "Unsubscribe" : format === "html" ? "メール配信を解除する" : "メール配信の解除";
        expect(output[format].includes(footer)).toBe(true);
        expect(/Unsubscribe|メール配信/.test(output[format])).toBe(true);
        expect(output[format]).toContain(locale === "ja"
          ? plugin === "muedsat" ? "無料のトランス・サチュレーション・プラグイン" : plugin === "muedlim" ? "無料のトゥルーピーク・リミッター" : "無料のサチュレーター"
          : plugin === "muedsat" ? "free transformer-saturation plugin" : plugin === "muedlim" ? "free true-peak limiter" : "free saturator");
      }
      if (plugin === "muedsat") {
        expect(output.html).toContain(locale === "ja"
          ? "僕の言葉より、あなた自身の耳で決めてください。"
          : "I'd rather you decide with your own ears than take my word for it.");
      }
      const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
      const render = vi.spyOn(emailTemplates, template);
      await emailService[sender]({ email: "listener@example.com" }, data);
      expect(send).toHaveBeenCalledTimes(1);
      const sent = send.mock.calls[0][0];
      for (const format of ["html", "text"] as const) {
        expect(sent[format]?.includes(news(plugin, locale, format))).toBe(true);
        expect(sent[format]).toContain(downloadUrl);
      }
      expect(render).toHaveBeenCalledTimes(1);
      const templateData = render.mock.calls[0][0];
      expect(templateData).toEqual({ ...data, unsubscribeUrl: expect.any(String) });
      expect(templateData.unsubscribeUrl).toContain('/api/plugins/unsubscribe?');
      const url = new URL(templateData.unsubscribeUrl!);
      expect(url.searchParams.get('plugin')).toBe(plugin);
      expect(url.searchParams.get('email')).toBe('listener@example.com');
      expect(url.searchParams.get('locale')).toBe(locale);
      expect(sent.headers).toEqual({
        'List-Unsubscribe': `<${templateData.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      });
      expect(sent.html).toContain(templateData.unsubscribeUrl!);
      expect(sent.text).toContain(templateData.unsubscribeUrl!);
      for (const format of ["html", "text"] as const) {
        expect(sent[format]?.includes('/dashboard/plugins')).toBe(true);
        expect(sent[format]?.includes('/muedsp')).toBe(true);
      }
    });
  });
});

// kimny 2026-10-28 「B」: without the checkbox the welcome is the download mail only — no news, no list to leave.
describe.each(cases)("$plugin welcome without news consent", ({ plugin, template, sender }) => {
  describe.each(["ja", "en"] as const)("%s", (locale) => {
    it("carries the download link but no news line, no unsubscribe link and no List-Unsubscribe header", async () => {
      const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
      const render = vi.spyOn(emailTemplates, template);
      await emailService[sender]({ email: "listener@example.com" }, { locale, marketingOptIn: false });
      expect(render).toHaveBeenCalledTimes(1);
      expect(render.mock.calls[0][0].unsubscribeUrl).toBeUndefined();
      const sent = send.mock.calls[0][0];
      for (const format of ["html", "text"] as const) {
        expect(sent[format]).toContain(PLUGIN_DIST[plugin].downloadUrl);
        expect(sent[format]?.includes(news(plugin, locale, format))).toBe(false);
        expect(sent[format]).not.toContain("/api/plugins/unsubscribe");
      }
      expect(sent.headers).toBeUndefined();
      send.mockRestore();
      render.mockRestore();
    });
  });
});
