import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import voxJa from "@/messages/muedvox.ja.json";
import voxEn from "@/messages/muedvox.en.json";

// kimny 2026-10-15 (via Chief, keeping the 10/9 decision): $69 fixed, no sales — said on the FAQ and next to
// the price on /muedvox and /muedsp (masterchain). The live FastSpring quote on 10/15 was $69.00 with a $0 discount
// for both products.
//
// ★No "discount" / "割引" / "sale price" wording: there is no higher regular price, so the copy must not imply one.
const NO_REFERENCE_PRICE = /割引|値引き後|定価|通常価格|discount|regular price|sale price|list price/i;

describe("$69 fixed, no sales", () => {
  it.each([
    ["ja", ja, voxJa],
    ["en", en, voxEn],
  ] as const)("%s says it beside both prices and in both FAQs", (_locale, site, vox) => {
    const lines = [site.muedsp.masterchain.noSale, vox.buy.noSale];
    const voxFaq = vox.faq.items.find((item) => item.id === "price");
    const answers = [site.support.faq.q12.answer, voxFaq?.answer ?? ""];

    expect(voxFaq?.requires).toBe("purchase");
    // The MUEDvox line sits right under its own price line and may not repeat a sentence from messages/<locale>.json
    // (muedvox-client-messages: MUEDvox's words stay out of the shared file), so only it may omit the figure.
    for (const text of [site.muedsp.masterchain.noSale, ...answers]) expect(text).toContain("$69");
    for (const text of [...lines, ...answers]) expect(text).not.toMatch(NO_REFERENCE_PRICE);
    expect(site.support.faq.q12.answer).toContain("masterchain");
    expect(site.support.faq.q12.answer).toContain("MUEDvox");
  });

  it("renders the lines under each price and lists q12 on /support (both key lists)", () => {
    const muedsp = readFileSync("components/features/muedsp-landing/muedsp-landing-content.tsx", "utf8");
    const vox = readFileSync("components/features/muedvox-landing/muedvox-landing-content.tsx", "utf8");
    const support = readFileSync("app/[locale]/support/page.tsx", "utf8");

    // indexOf is -1 for a missing string, so assert presence first or the ordering check passes vacuously.
    expect(muedsp).toContain('tmc("noSale")');
    expect(muedsp.indexOf('tmc("noSale")')).toBeGreaterThan(muedsp.indexOf('tmc("priceLive")'));
    expect(vox).toContain('t("buy.noSale")');
    expect(vox.indexOf('t("buy.noSale")')).toBeGreaterThan(vox.indexOf('t("buy.price")'));
    expect(support.match(/"q12" as const/g)).toHaveLength(2); // structured data and the visible list
  });
});
