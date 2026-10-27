import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import vja from "@/messages/muedvox.ja.json";
import ven from "@/messages/muedvox.en.json";

// kimny 2026-10-28 「B」 (via conductor): MUEDsp news only with a checkbox (default off). The download link always goes out.
// The checkbox label is the same on every form; the line under it says only what the email is for.
const CONSENT = {
  ja: "MUEDsp のお知らせをメールで受け取る（いつでも解除できます）",
  en: "Email me news from MUEDsp (unsubscribe anytime)",
} as const;
const FREE_NOTE = { ja: "ダウンロードリンクをメールでお送りします。", en: "We'll email you the download link." } as const;
const DEMO_NOTE = { ja: "ダウンロードリンクの控えをメールでお送りします。", en: "We'll email you a copy of the download link." } as const;
const FREQUENCY = /occasional|now and then|a few times|monthly|weekly|年に|月に|ときどき|たまに/i;

describe.each([["ja", ja, vja], ["en", en, ven]] as const)("%s news consent wording", (locale, messages, vox) => {
  const forms = [
    { name: "muedsat", consent: messages.muedsat.form.consent, note: messages.muedsat.form.note, expected: FREE_NOTE },
    { name: "muedlim", consent: messages.muedlim.form.consent, note: messages.muedlim.form.note, expected: FREE_NOTE },
    { name: "muedrive", consent: messages.muedrive.form.consent, note: messages.muedrive.form.note, expected: FREE_NOTE },
    { name: "masterchain demo", consent: messages.muedsp.demo.consent, note: messages.muedsp.demo.emailNotice, expected: DEMO_NOTE },
    { name: "MUEDvox demo", consent: vox.demoForm.consent, note: vox.demoForm.emailNotice, expected: DEMO_NOTE },
  ];
  it.each(forms)("$name: the one checkbox label, and a note that promises no news", ({ consent, note, expected }) => {
    expect(consent).toBe(CONSENT[locale]);
    expect(note).toBe(expected[locale]);
    // ★The line everyone sees, ticked or not, must not say news will come — only the checkbox may.
    expect(note).not.toMatch(/お知らせ|news/i);
    for (const text of [consent, note]) {
      expect(text).not.toMatch(FREQUENCY);
      expect(text).not.toMatch(/plug-in/i);
    }
  });

  // News goes to two groups, and the policy names both (CCO #1315): those who ticked a form's box, and buyers, whom
  //   the cart tells (cartAudienceNote, kimny 10/6 「購入者をメールに入れます」 — conductor 10/28: unchanged).
  it("the privacy policy's purpose for news names the checkbox and the buyers the cart tells", () => {
    const deliver = messages.privacy.section2.items.deliver;
    expect(deliver).toContain(locale === "ja" ? "フォームのチェック欄で希望された方" : "to those who ticked the box on the form");
    expect(deliver).toContain(locale === "ja" ? "ご購入の際にその旨をお知らせした購入者の方" : "to buyers, who are told so at checkout");
    // The cart really does tell them — the sentence the policy points to exists.
    expect(messages.muedsp.buyTry.cartAudienceNote).toContain(locale === "ja" ? "MUEDsp のお知らせ" : "news from MUEDsp");
  });
});
