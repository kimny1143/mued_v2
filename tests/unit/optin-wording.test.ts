import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

/**
 * The updates opt-in wording (kimny 2026-10-04, via Chief): one sentence for every form that has the box —
 * the three free plugins and the masterchain demo — and no promise of how often we write
 * (kimny「いちいち入れたらこっちの手が減るだろ」). The default stays OFF (pinned in the form tests).
 */
const CONSENT = {
  ja: "このプラグインの更新と、新しい MUEDsp プラグインのお知らせをメールで受け取る（いつでも解除できます）",
  en: "Email me when this plug-in is updated and when new MUEDsp plug-ins come out (unsubscribe anytime)",
} as const;

const FREQUENCY = /occasional|now and then|a few times|monthly|weekly|年に|月に|ときどき|たまに/i;

describe.each([["ja", ja], ["en", en]] as const)("%s opt-in wording", (locale, messages) => {
  const forms = {
    muedsat: messages.muedsat.form,
    muedlim: messages.muedlim.form,
    muedrive: messages.muedrive.form,
  };

  it.each(Object.keys(forms))("%s: the checkbox says the approved sentence", (key) => {
    expect(forms[key as keyof typeof forms].consent).toBe(CONSENT[locale]);
  });

  it("masterchain demo: the same sentence", () => {
    expect(messages.muedsp.demo.consent).toBe(CONSENT[locale]);
  });

  it.each(Object.keys(forms))("%s: the note promises no frequency", (key) => {
    expect(forms[key as keyof typeof forms].note).not.toMatch(FREQUENCY);
    expect(forms[key as keyof typeof forms].consent).not.toMatch(FREQUENCY);
  });
});
