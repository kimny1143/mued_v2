/**
 * masterchain 1.0.3's demo (dsp 3a977b86, 2026-10-17): no time limit, about 3 s of dry audio every 45 s of sound,
 * settings save with the session, an expired trial key is the demo (no "DEMO EXPIRED" screen). Wording: conductor
 * 2026-10-17 (A/B/C). ★No masterchain surface may still describe 1.0.2's demo (45 s per insert, then pass-through
 * until reinserted; settings not saved; "DEMO EXPIRED").
 * ★Scoped to masterchain's own keys and mails: MUEDvox's demo text lives in the same files and has its own test.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import approvedEn from "@/docs/copy/approved-en.json";
import approvedJa from "@/docs/copy/approved-ja.json";
import { emailTemplates } from "@/lib/services/email.service";

const OLD_1_0_2 = [
  "DEMO EXPIRED",
  "挿し直す",
  "挿すたびに最初",
  "reinsert",
  "first 45 seconds",
  "Each insert processes",
  "設定は保存されず",
  "設定・プリセットは保存できません",
  "Settings aren't saved",
  "Settings and presets aren't saved",
];
const stale = (text: string) => OLD_1_0_2.filter((phrase) => text.includes(phrase));

const surfaces = (locale: "ja" | "en") => {
  const m = locale === "ja" ? ja : en;
  const approved = locale === "ja" ? approvedJa : approvedEn;
  const mails = [
    emailTemplates.masterchainDemoFollowup(locale),
    emailTemplates.masterchainDemoDownload({ locale }),
    emailTemplates.masterchainTrialDelivery({ locale, expiresAt: "2026-11-01T00:00:00Z" }),
  ];
  return {
    "messages muedsp": JSON.stringify(m.muedsp),
    "messages pluginPortal.trial": JSON.stringify(m.pluginPortal.trial),
    "messages support.faq.q10": JSON.stringify(m.support.faq.q10),
    "docs/copy approved": JSON.stringify(approved),
    mails: mails.map((mail) => `${mail.subject}\n${mail.text}\n${mail.html}`).join("\n"),
  };
};

describe("★masterchain's site text describes the 1.0.3 demo, not 1.0.2's", () => {
  it.each(["ja", "en"] as const)("%s: none of 1.0.2's demo phrases on masterchain's keys and mails", (locale) => {
    for (const [name, text] of Object.entries(surfaces(locale))) expect({ name, found: stale(text) }).toEqual({ name, found: [] });
  });

  it("llms.txt's masterchain line: none of 1.0.2's demo phrases", () => {
    const line = readFileSync("app/llms.txt/route.ts", "utf8").split("\n").find((l) => l.includes("**MUEDsp masterchain**")) ?? "";
    expect(line).not.toBe("");
    expect(stale(line)).toEqual([]);
    expect(line).toContain("45 秒ごとに約 3 秒");
  });

  it("the new rule is there, in both languages (positive control for the scan above)", () => {
    expect(ja.muedsp.buyTry.demoNote).toContain("45 秒ごとに約 3 秒、処理が外れて元の音");
    expect(en.muedsp.buyTry.demoNote).toContain("every 45 seconds, processing drops out for about 3 seconds");
  });
});
