import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_PURCHASE_LIVE } from "@/lib/masterchain/config";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

// ★Purchase opens after the demo (conductor's order, 2026-09-30): demo → kimny's verification order →
//   purchase → launch send → LAUNCH_AT.
it("purchase is open only with the demo already open", () => {
  expect(MASTERCHAIN_PURCHASE_LIVE).toBe(true);
  if (MASTERCHAIN_PURCHASE_LIVE) expect(MASTERCHAIN_DEMO_LIVE).toBe(true);
});

it("★an open Buy button never says \"Coming soon\" — the label and price note switch on the same flag", () => {
  const landing = readFileSync("components/features/muedsp-landing/muedsp-landing-content.tsx", "utf8");
  expect(landing).toContain('tmc(MASTERCHAIN_PURCHASE_LIVE ? "buyLabelLive" : "buyLabel")');
  // ★The closed-state price line ("Available at launch") shows only while closed; open, the price is in the
  //   purchase modal (FastSpring's own figure), not on the button (kimny 10/1).
  expect(landing).toMatch(/\{!MASTERCHAIN_PURCHASE_LIVE && \(\s*<p[^>]*>\{tmc\("priceNote"\)\}<\/p>/);
  // The "notify me at launch" link is for the closed state only.
  expect(landing).toMatch(/\{!MASTERCHAIN_PURCHASE_LIVE && \(\s*<a\s+href="#get"[\s\S]*?発売時に知らせる/);
  for (const m of [ja, en]) {
    const mc = m.muedsp.masterchain;
    expect(mc.buyLabelLive).toBeTruthy();
    expect(mc.buyLabelLive).not.toBe(mc.buyLabel);
    // ★No price on the button (kimny 10/1: 「$69を押した後に日本円が出てくる…離脱につながる」) — the modal shows
    //   FastSpring's figure in the buyer's currency.
    expect(mc.buyLabelLive).toMatch(/masterchain/);
    expect(mc.buyLabelLive).not.toMatch(/\$|¥|69/);
  }
});

it("★the plugin's button names are quoted exactly — 'Load license file…' with U+2026, never three dots (dsp 2026-09-30)", () => {
  for (const f of ["messages/ja.json", "messages/en.json", "lib/services/email.service.ts"]) {
    const src = readFileSync(f, "utf8");
    expect(src, f).not.toMatch(/Load license file\.\.\./);
    expect(src, f).toContain("Load license file…");
    expect(src, f).toContain("Paste license from clipboard");
  }
});

it("★ja and en have their own button words (kimny 10/1: 「JP ENの区別もちゃんとつけよう」)", () => {
  expect(ja.muedsp.masterchain.buyLabelLive).toBe("masterchain を購入");
  expect(en.muedsp.masterchain.buyLabelLive).toBe("Buy masterchain");
  expect(ja.muedsp.buyTry.try).toBe("masterchain を試す");
  expect(en.muedsp.buyTry.try).toBe("Try masterchain");
});
