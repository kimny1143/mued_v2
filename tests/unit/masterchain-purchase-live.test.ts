import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_PURCHASE_LIVE } from "@/lib/masterchain/config";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

// ★Purchase opens after the demo (conductor's order, 2026-09-30): demo → kimny's verification order →
//   purchase → launch send → LAUNCH_AT.
it("purchase is open only with the demo already open", () => {
  expect(typeof MASTERCHAIN_PURCHASE_LIVE).toBe("boolean"); // ★open or closed; the rule below is what holds
  if (MASTERCHAIN_PURCHASE_LIVE) expect(MASTERCHAIN_DEMO_LIVE).toBe(true);
});

it("★an open Buy button never says \"Coming soon\" — the label and price note switch on the same flag", () => {
  const landing = readFileSync("components/features/muedsp-landing/muedsp-landing-content.tsx", "utf8");
  expect(landing).toContain('tmc(MASTERCHAIN_PURCHASE_LIVE ? "buyLabelLive" : "buyLabel")');
  expect(landing).toContain('tmc(MASTERCHAIN_PURCHASE_LIVE ? "priceNoteLive" : "priceNote")');
  // The "notify me at launch" link is for the closed state only.
  expect(landing).toMatch(/\{!MASTERCHAIN_PURCHASE_LIVE && \(\s*<a\s+href="#get"[\s\S]*?発売時に知らせる/);
  for (const m of [ja, en]) {
    const mc = m.muedsp.masterchain;
    expect(mc.buyLabelLive).toBeTruthy();
    expect(mc.buyLabelLive).not.toBe(mc.buyLabel);
    expect(mc.priceNoteLive).toContain("$69");
    expect(mc.priceNoteLive).not.toMatch(/発売と同時|Available at launch/);
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
