import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MASTERCHAIN_DEMO_LIVE } from "@/lib/masterchain/config";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

it("keeps the demo closed in product UI, FAQ UI and FAQ structured data", () => {
  expect(MASTERCHAIN_DEMO_LIVE).toBe(false);
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
