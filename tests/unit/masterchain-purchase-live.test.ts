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
  expect(landing).toContain('tmc(MASTERCHAIN_PURCHASE_LIVE ? "priceNoteLive" : "priceNote")');
  expect(landing).toContain('tmc(MASTERCHAIN_PURCHASE_LIVE ? "eyebrowLive" : "eyebrow")');
  for (const m of [ja, en]) {
    const mc = m.muedsp.masterchain;
    expect(mc.buyLabelLive).toBeTruthy();
    expect(mc.buyLabelLive).not.toBe(mc.buyLabel);
    expect(mc.priceNoteLive).toContain("$69");
    expect(mc.eyebrowLive).toMatch(/^(発売中|Out now)$/); // conductor 2026-09-30
    expect(mc.priceNoteLive).not.toMatch(/発売と同時|Available at launch/);
  }
});
