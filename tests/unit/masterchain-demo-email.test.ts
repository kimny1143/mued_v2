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
    expect(body).toContain(locale === "ja" ? "キーを入れなくても、デモとして期限なく使えます。デモの間は 45 秒ごとにエフェクトが一瞬抜け、開くたびに設定が既定に戻り、プリセットは保存できません。ライセンスキーを入れると、これらの制限はなくなります。" : "Without a key, masterchain runs as a demo with no time limit. In the demo the effect fades out every 45 seconds, settings return to their defaults each time you open it, and presets can't be saved. Entering a license key removes these limits.");
    expect(body).not.toMatch(/unsubscribe|dashboard\/plugins|アップデート|updates/i);
  }
});
