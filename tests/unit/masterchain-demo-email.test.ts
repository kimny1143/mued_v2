import { expect, it, vi } from "vitest";
import { emailService, emailTemplates } from "@/lib/services/email.service";
import { MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";

it.each(["ja", "en"] as const)("renders the %s receipt with the download and demo limits, without marketing", (locale) => {
  const template = emailTemplates.masterchainDemoDownload({ locale });
  expect(template.subject).toBe(locale === "ja" ? "MUEDsp masterchain デモのダウンロード" : "Your MUEDsp masterchain demo download");
  for (const body of [template.html, template.text]) {
    expect(body).toContain(MASTERCHAIN_DOWNLOAD_URL);
    expect(body).toContain("VST3 · AU · AAX (Pro Tools) · macOS");
    expect(body).toContain(locale === "ja" ? "MUEDsp masterchain のデモをお試しいただき、ありがとうございます。" : "Thanks for trying the MUEDsp masterchain demo.");
    // ★1.0.3 (dsp 3a977b86, conductor's wording B 2026-10-17): about 3 s of dry audio every 45 s, settings save.
    expect(body).toContain(locale === "ja" ? "masterchain はキーを入れなくてもデモとして動き、期限はありません。デモでは、音の 45 秒ごとに約 3 秒、処理が外れて元の音のまま通ります。設定はセッションにふつうに保存され、デモで作ったセッションはライセンスキーを入れた後もそのまま開けます。ライセンスキーを入れると、この抜けはなくなります。" : "Without a key, masterchain runs as a demo with no time limit. In the demo, every 45 seconds of audio, processing drops out for about 3 seconds and your original audio plays through. Settings save with your session as usual, and sessions made in the demo open unchanged once you enter a license key. Entering a license key removes the gaps.");
    expect(body).not.toMatch(/unsubscribe|dashboard\/plugins|アップデート|updates/i);
    // ★Without consent: the transactional receipt only — no buy paragraph, no tagged link (kimny 9/30, CCO #1182).
    expect(body).not.toContain("/l/mc-demo-mail");
    expect(body).not.toMatch(/製品ページから購入|buy it from the product page/);
    // ★1.0.2's rule (45 s per insert, then pass-through until reinserted; settings not saved) is gone in 1.0.3.
    expect(body).not.toMatch(/挿し直す|reinsert|first 45 seconds|設定は保存されず|aren't saved|プリセットも保存できません|presets can't be saved/);
  }
});

it.each(["ja", "en"] as const)("★%s: with consent the receipt carries a working unsubscribe link; without, none", (locale) => {
  const url = "https://mued.jp/api/plugins/unsubscribe?plugin=masterchain&email=a%40b.com&t=x&locale=" + locale;
  const withLink = emailTemplates.masterchainDemoDownload({ locale, unsubscribeUrl: url });
  for (const body of [withLink.html, withLink.text]) expect(body).toContain(url);
  expect(withLink.html).toContain(locale === "ja" ? "メール配信を解除する" : "Unsubscribe from these emails");
  const without = emailTemplates.masterchainDemoDownload({ locale });
  for (const body of [without.html, without.text]) expect(body).not.toMatch(/unsubscribe|配信を解除|配信の解除/i);
});

it.each(["ja", "en"] as const)("★%s: with consent the receipt also says how to buy and where the key goes (d)", (locale) => {
  const url = "https://mued.jp/api/plugins/unsubscribe?plugin=masterchain&email=a%40b.com&t=x&locale=" + locale;
  const t = emailTemplates.masterchainDemoDownload({ locale, unsubscribeUrl: url });
  for (const body of [t.html, t.text]) {
    expect(body).toContain("/l/mc-demo-mail");
    expect(body).toContain(locale === "ja" ? "購入時のメールアドレスで mued.jp にサインインすると、ポータルで鍵を受け取れます。" : "sign in to mued.jp with the email you used at checkout");
  }
});

// kimny 2026-10-04: handlers always pass true after showing the email-use notice.
it.each(["ja", "en"] as const)("%s: the notice-based receipt service sends unsubscribe in HTML, text and headers", async (locale) => {
  const send = vi.spyOn(emailService, "send").mockResolvedValue({ success: true });
  await emailService.sendMasterchainDemoDownload({ email: "listener@example.com" }, { locale, marketingOptIn: true });
  expect(send).toHaveBeenCalledTimes(1);
  const sent = send.mock.calls[0][0];
  expect(sent.html).toContain("/api/plugins/unsubscribe?");
  expect(sent.text).toContain("/api/plugins/unsubscribe?");
  expect(sent.headers).toEqual({
    "List-Unsubscribe": expect.stringContaining("/api/plugins/unsubscribe?"),
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
});
