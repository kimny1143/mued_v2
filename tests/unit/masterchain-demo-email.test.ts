import { expect, it } from "vitest";
import { emailTemplates } from "@/lib/services/email.service";
import { MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";

it.each(["ja", "en"] as const)("renders the %s receipt with the download and demo limits, without marketing", (locale) => {
  const template = emailTemplates.masterchainDemoDownload({ locale });
  expect(template.subject).toBe(locale === "ja" ? "MUEDsp masterchain デモのダウンロード" : "Your MUEDsp masterchain demo download");
  for (const body of [template.html, template.text]) {
    expect(body).toContain(MASTERCHAIN_DOWNLOAD_URL);
    expect(body).toContain("VST3 · AU · AAX (Pro Tools) · macOS");
    expect(body).toContain(locale === "ja" ? "MUEDsp masterchain のデモをお試しいただき、ありがとうございます。" : "Thanks for trying the MUEDsp masterchain demo.");
    expect(body).toContain(locale === "ja" ? "キーを入れなくても、デモとして期限なく使えます。デモでは、挿してから、音を 45 秒ぶん処理するまではすべて効き、その後はプラグインを挿し直すまで原音のまま通ります。設定は保存されず、プリセットも保存できません。ライセンスキーを入れると、これらの制限はなくなります。" : "Without a key, masterchain runs as a demo with no time limit. In the demo it processes the first 45 seconds of audio after you insert it, then passes audio through unprocessed until you reinsert it. Settings aren't saved and presets can't be saved. Entering a license key removes these limits.");
    expect(body).not.toMatch(/unsubscribe|dashboard\/plugins|アップデート|updates/i);
    // ★The demo rule changed on 2026-09-30 (kimny): 45 s of processed audio per insert, not a fade every 45 s.
    expect(body).not.toMatch(/45 秒ごと|every 45 seconds|一瞬抜け|fades out/);
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
