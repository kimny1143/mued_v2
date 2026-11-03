/**
 * The MUEDvox demo's limits, as /muedvox states them (kimny 2026-11-03 via conductor: the demo blocks MIDI export,
 * and the page says so in line with the EULA). VOX 2026-11-03: in 1.1.0 (the build served), "Save MIDI…" is greyed
 * out without a license and reads "(needs a license)"; 1.0.2 had no MIDI export at all.
 *
 * The three places that state the limits must say the same four things, in ja and en: never expires, the harmony
 * drops for about 3 s every 45 s, saving presets needs a license, Save MIDI… needs a license.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `muedvox.${l}.json`), "utf8"));

const PLACES = (m: ReturnType<typeof load>): Record<string, string> => ({
  "demo.body": m.demo.body,
  "demoForm.demoNote": m.demoForm.demoNote,
  "faq demo answer": m.faq.items.find((i: { id: string }) => i.id === "demo").answer,
});

const NEEDS: Record<string, RegExp[]> = {
  en: [/never expires/, /every 45 seconds/, /about 3 seconds/, /Saving presets/, /MIDI files \(Save MIDI…\)/, /need a license/],
  ja: [/期限なし/, /45 秒ごと/, /3 秒ほど/, /プリセットの保存/, /MIDI ファイルの書き出し（Save MIDI…）/, /製品版のみ/],
};

describe.each(["en", "ja"])("/muedvox demo limits (%s)", (l) => {
  const places = PLACES(load(l));

  it.each(Object.keys(places))("%s states all four limits", (k) => {
    const s = places[k];
    expect(typeof s).toBe("string");
    for (const re of NEEDS[l]) expect(s, `${l} ${k}`).toMatch(re);
  });

  it("the UI label is the plugin's own (Save MIDI… with the ellipsis character, not three dots)", () => {
    for (const s of Object.values(places)) {
      expect(s).toContain("Save MIDI…");
      expect(s).not.toContain("Save MIDI...");
    }
  });
});

it("positive control: the old wording (presets only) fails the MIDI check", () => {
  const old = "The demo never expires: every 45 seconds the harmony drops out for about 3 seconds (your lead keeps playing). Saving presets needs a license; sessions made in the demo open unchanged once you add one.";
  expect(NEEDS.en.every((re) => re.test(old))).toBe(false);
  expect(/MIDI files \(Save MIDI…\)/.test(old)).toBe(false);
});
