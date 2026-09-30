import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

/** The version in a masterchain download URL (…-1.0.1-installer.pkg → "1.0.1"). */
const versionIn = (url: string) => new URL(url).pathname.match(/-(\d+\.\d+\.\d+)-installer\.pkg$/)?.[1] ?? null;

it("★the demo is open only on a build that has the demo (never 1.0.0 — DemoFade=0 there, CCO)", () => {
  expect(MASTERCHAIN_DEMO_LIVE).toBe(true);
  const v = versionIn(MASTERCHAIN_DOWNLOAD_URL);
  // ★Positive control: the parser reads a version at all (null would make the check below vacuous).
  expect(v).not.toBeNull();
  expect(versionIn("https://mued.jp/downloads/MUEDsp-masterchain-1.0.0-installer.pkg")).toBe("1.0.0");
  if (MASTERCHAIN_DEMO_LIVE) expect(v, "DEMO_LIVE on a 1.0.0 URL: the demo copy would describe behaviour 1.0.0 does not have").not.toBe("1.0.0");
});

it("gates the demo in product UI, FAQ UI and FAQ structured data on the one flag", () => {
  const product = readFileSync("components/features/muedsp-landing/muedsp-landing-content.tsx", "utf8");
  expect(product).toMatch(/MASTERCHAIN_DEMO_LIVE && \([\s\S]*?tmc\("demoNote"\)[\s\S]*?id="demo"[\s\S]*?<MasterchainDemoForm \/>[\s\S]*?\)}/);
  expect(product.indexOf("{MASTERCHAIN_DEMO_LIVE &&")).toBeGreaterThan(product.indexOf("<MasterchainPurchaseControl"));
  const support = readFileSync("app/[locale]/support/page.tsx", "utf8");
  expect(support.match(/\.\.\.\(MASTERCHAIN_DEMO_LIVE \? \["q10" as const\] : \[\]\)/g)).toHaveLength(2);
  const legal = readFileSync("app/[locale]/tokushoho/page.tsx", "utf8");
  expect(legal).toContain('cancellationDemo={MASTERCHAIN_DEMO_LIVE ? t("muedsp.cancellation.demo") : undefined}');
});
it("keeps all new translation keys paired", () => {
  expect(Object.keys(ja.muedsp.demo)).toEqual(Object.keys(en.muedsp.demo));
  expect(Object.keys(ja.muedsp.demo.errors)).toEqual(Object.keys(en.muedsp.demo.errors));
  for (const messages of [ja, en]) {
    expect(messages.muedsp.masterchain.demoNote).toBeTruthy();
    expect(messages.support.faq.q10.question).toBeTruthy();
    expect(messages.support.faq.q10.answer).toBeTruthy();
    expect(messages.tokushoho.muedsp.cancellation.demo).toBeTruthy();
  }
});
