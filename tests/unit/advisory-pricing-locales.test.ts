import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/advisory/config", () => ({ ADVISORY_LIVE: true }));
vi.mock("@/lib/muedsat/config", () => ({ MUEDSAT_LIVE: false }));
vi.mock("@/lib/muedsp/config", () => ({ MUEDSP_LIVE: false }));
vi.mock("@/lib/muedlim/config", () => ({ MUEDLIM_LIVE: false }));
vi.mock("@/lib/muedrive/config", () => ({ MUEDRIVE_LIVE: false }));

import { GET } from "@/app/llms.txt/route";

const LOCALES = ["ja", "en"] as const;
const CANONICAL_PRICES = {
  initialConsultationYen: 0,
  programMonthlyYen: 100000,
  programTotalYen: 300000,
  guardianMonthlyYen: 30000,
  spotYen: 30000,
} as const;
const PRICE_KEYS = Object.keys(CANONICAL_PRICES) as (keyof typeof CANONICAL_PRICES)[];
const RETIRED_PRICES = [250000, 275000, 200000, 220000, 400000, 440000] as const;

type Messages = {
  advisory: { pricing: { values: Record<string, unknown>; cancellation: string } };
  tokushoho: {
    payment: { value: string };
    advisory: {
      price: { description: string; plans: Record<string, string> };
      paymentTiming: { value: string };
      cancellation: { description: string };
      delivery: { value: string };
      contact: { value: string };
    };
  };
};

function messages(locale: (typeof LOCALES)[number]): Messages {
  return JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as Messages;
}

function compact(value: unknown): string {
  return JSON.stringify(value).replace(/[\s,，]/g, "");
}

function expectNoRetiredPrices(value: unknown): void {
  for (const retired of RETIRED_PRICES) {
    expect(compact(value).includes(String(retired)), `Retired price ${retired} remains`).toBe(false);
  }
}

function priceValues(locale: (typeof LOCALES)[number]): Record<string, unknown> {
  return messages(locale).advisory.pricing.values;
}

type RawLegalText = {
  cancellation: string;
  payment: string;
  paymentTiming: string;
};

function rawLegalText(locale: (typeof LOCALES)[number]): RawLegalText {
  const legal = messages(locale).tokushoho;
  return {
    cancellation: legal.advisory.cancellation.description,
    payment: legal.payment.value,
    paymentTiming: legal.advisory.paymentTiming.value,
  };
}

// Text guards deliberately receive raw strings, never compact() output.
// kimny settled the terms on 2026-09-21: no early termination, lump sum or installments,
// credit card (Stripe) or bank transfer (invoice). The [kimny confirmation] markers must
// now be ABSENT. Both spellings are checked deliberately: a ja-only predicate
// (`git grep "kimny 確認"`) returns 0 while the English page still renders markers.
// Invented due-day counts must not appear either — kimny has not fixed the due dates.
function textGuardHits(locale: (typeof LOCALES)[number], raw: RawLegalText) {
  const anytime = locale === "ja" ? /いつでも解約/ : /at any time/i;
  const fixedTerm = locale === "ja" ? /3ヶ月/ : /3-month/i;
  const deferredPayment = locale === "ja"
    ? /確定後に記載|個別にご案内(?:します)?|決定後に(?:記載|ご案内)/
    : /will be stated once|arranged individually|will be (?:stated|specified) (?:once|after)/i;
  const pendingMarker = /\[kimny (?:確認|confirmation):/;
  const inventedDueDays = locale === "ja" ? /\d+\s*日以内/ : /within\s+\d+\s+days/i;
  return {
    cancellationMissingTerm: Number(anytime.test(raw.cancellation) && !fixedTerm.test(raw.cancellation)),
    deferredPayment: Number(deferredPayment.test(raw.payment)),
    deferredPaymentTiming: Number(deferredPayment.test(raw.paymentTiming)),
    pendingMarker: Number(
      pendingMarker.test(raw.cancellation)
      || pendingMarker.test(raw.payment)
      || pendingMarker.test(raw.paymentTiming),
    ),
    inventedDueDays: Number(inventedDueDays.test(raw.payment) || inventedDueDays.test(raw.paymentTiming)),
  };
}

describe("advisory pricing — locale parity and publication coverage", () => {
  it.each(LOCALES)("%s has every canonical numeric price key", (locale) => {
    const values = priceValues(locale);

    for (const key of PRICE_KEYS) {
      expect(values, `${locale}: missing advisory.pricing.values.${key}`).toHaveProperty(key);
      expect(values[key], `${locale}: ${key} must be numeric`).toEqual(expect.any(Number));
      expect(values[key], `${locale}: ${key} must match the approved price`).toBe(CANONICAL_PRICES[key]);
    }
  });

  it("keeps the Japanese and English numeric values identical", () => {
    const ja = priceValues("ja");
    const en = priceValues("en");

    expect(Object.fromEntries(PRICE_KEYS.map((key) => [key, ja[key]]))).toEqual(
      Object.fromEntries(PRICE_KEYS.map((key) => [key, en[key]])),
    );
  });

  it.each(LOCALES)("%s has no retired prices in ANY message namespace", (locale) => {
    expectNoRetiredPrices(messages(locale));
  });

  it.each(LOCALES)("%s publishes the new prices in the rendered legal disclosure rows", (locale) => {
    const disclosure = messages(locale).tokushoho.advisory;
    // These legacy keys are the four rows actually consumed by the tokushoho page.
    const { consult, diagnosis: program, build: support, companion: spot } = disclosure.price.plans;
    expect(consult).toMatch(locale === "ja" ? /無料/ : /free/i);
    expect(consult).toContain("60");
    for (const price of [100000, 110000, 300000, 330000]) {
      expect(compact(program)).toContain(String(price));
    }
    expect(program).toMatch(locale === "ja" ? /月額/ : /\/month/);
    expect(program).toMatch(locale === "ja" ? /3ヶ月/ : /3-month/);
    expect(program).toMatch(locale === "ja" ? /分割可/ : /installments available/);
    for (const row of [support, spot]) {
      expect(compact(row)).toContain("30000");
      expect(compact(row)).toContain("33000");
    }
    expect(support).toMatch(locale === "ja" ? /月額/ : /\/month/);
    expect(spot).toContain("90");
    expect(disclosure.contact.value).toBe("support@mued.jp");
  });

  it("keeps the complete Japanese and English message key sets identical", () => {
    function keys(value: unknown, prefix = ""): string[] {
      if (value === null || typeof value !== "object") return [];
      return Object.entries(value).flatMap(([key, child]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return [path, ...keys(child, path)];
      }).sort();
    }
    expect(keys(messages("ja"))).toEqual(keys(messages("en")));
  });

  // Both legal locations must state the SAME payment methods. They differ only in their prefix
  // ("MUED advisory: " vs "支払方法: "), so compare the REMAINDER byte-for-byte. A `toBe` on the
  // whole line would force the prefixes to match too — which they must not.
  // Per menu (kimny 2026-09-21): the 3-month program is invoice-only, because no ¥100,000×3
  // price object exists in Stripe and it therefore cannot be charged by card.
  it.each(LOCALES)("%s uses identical payment-method wording in both legal locations", (locale) => {
    const isJa = locale === "ja";
    const legal = messages(locale).tokushoho;
    const GLOBAL_PREFIX = "MUED advisory: ";
    const TIMING_PREFIX = isJa ? "支払方法: " : "Payment method: ";
    const globalLine = legal.payment.value.split("\n").find((line) => line.startsWith(GLOBAL_PREFIX));
    expect(globalLine, "payment.value must carry a MUED advisory line").toBeDefined();
    const timingLine = legal.advisory.paymentTiming.value.split("\n")[0];
    expect(timingLine.startsWith(TIMING_PREFIX), "paymentTiming must carry its prefix").toBe(true);
    const common = globalLine!.slice(GLOBAL_PREFIX.length);
    expect(common, "the shared sentence must be byte-identical in both legal locations")
      .toBe(timingLine.slice(TIMING_PREFIX.length));
    expect(common).not.toMatch(/\[kimny (?:確認|confirmation):/);

    const clauses = common.split(isJa ? "。" : ". ").filter(Boolean);
    const program = clauses.find((c) => c.includes(isJa ? "3ヶ月プログラム" : "3-month program"));
    expect(program, "the 3-month program clause must exist").toBeDefined();
    expect(program).toMatch(isJa ? /銀行振込（請求書）のみ/ : /bank transfer \(invoice\) only/i);
    expect(program, "the 3-month program is invoice-only").not.toMatch(isJa ? /クレジットカード/ : /credit card/i);
    const others = clauses.find((c) => c.includes(isJa ? "社内お守りプラン" : "in-house support plan"));
    expect(others, "the other-menus clause must exist").toBeDefined();
    expect(others).toMatch(isJa ? /スポット相談/ : /one-off consultation/i);
    expect(others).toMatch(isJa ? /クレジットカード（Stripe 経由）/ : /credit card \(via Stripe\)/i);
    expect(others).toMatch(isJa ? /銀行振込（請求書）/ : /bank transfer \(invoice\)/i);
  });

  it.each(LOCALES)("%s scopes delivery, payment and cancellation to each new paid service", (locale) => {
    const legal = messages(locale).tokushoho.advisory;
    const isJa = locale === "ja";
    const names = isJa
      ? ["3ヶ月プログラム", "社内お守りプラン", "スポット相談"]
      : ["3-month program", "In-house support plan", "One-off consultation"];
    const clauses = legal.cancellation.description.split("\n");
    const payments = legal.paymentTiming.value.split("\n");
    for (const name of names) {
      expect(clauses.some((line) => line.startsWith(`${name}:`)), name).toBe(true);
      expect(payments.some((line) => line.startsWith(`${name}:`)), name).toBe(true);
      expect(legal.delivery.value.toLowerCase()).toContain(name.toLowerCase());
    }
    const program = clauses.find((line) => line.startsWith(`${names[0]}:`))!;
    const support = clauses.find((line) => line.startsWith(`${names[1]}:`))!;
    const spot = clauses.find((line) => line.startsWith(`${names[2]}:`))!;
    expect(program).toMatch(isJa ? /契約期間は3ヶ月/ : /contract period is three months/);
    expect(program).toMatch(isJa ? /中途解約及び返金はお受けできません/ : /early termination and refunds are not available/i);
    expect(program).toMatch(isJa ? /未払残額/ : /unpaid balance/);
    expect(program).not.toMatch(isJa ? /翌契約月以降の課金は停止/ : /billing stops from the following contract month/);
    expect(support).toMatch(isJa ? /月単位で解約できます/ : /may be cancelled month to month/);
    expect(support).toMatch(isJa ? /当月分の日割り返金はありません/ : /no prorated refund/);
    expect(spot).toMatch(isJa ? /前日まで/ : /day before/);
    expect(spot).toMatch(isJa ? /当日キャンセル又は無断不参加/ : /same-day cancellation or no-show/);
    expect(legal.cancellation.description).not.toMatch(isJa ? /月額サービスはいつでも解約できます/ : /Monthly services may be cancelled at any time/);
    expect(legal.paymentTiming.value).toMatch(isJa ? /月額100,000円（税込110,000円）を3回/ : /invoiced three times/i);
    expect(legal.paymentTiming.value).toMatch(isJa ? /請求書に記載の支払期日/ : /due date stated on the invoice/i);
    expect(legal.price.description).toContain("10%");
    expect(legal.contact.value).toBe("support@mued.jp");
  });

  // The strongest term must appear where the buying decision is made, not only on the legal page.
  // Direction matters: assert tokushoho states it, THEN that the pricing surface repeats it —
  // dropping it from EITHER side then fails. Both use the same phrase on purpose, so one
  // regex covers both surfaces; a paraphrase on one side would not be detectable.
  it.each(LOCALES)("%s repeats the no-termination term on the pricing surface, not only in tokushoho", (locale) => {
    const isJa = locale === "ja";
    const noTermination = isJa ? /中途解約及び返金はお受けできません/ : /early termination and refunds are not available/i;
    const unpaidBalance = isJa ? /未払残額/ : /unpaid balance/i;
    const legal = messages(locale).tokushoho.advisory.cancellation.description;
    const lp = messages(locale).advisory.pricing.cancellation;
    expect(noTermination.test(legal), "tokushoho must state the no-termination term").toBe(true);
    expect(noTermination.test(lp), "advisory.pricing must repeat the no-termination term").toBe(true);
    expect(unpaidBalance.test(lp), "advisory.pricing must mention the unpaid balance").toBe(true);
    expect(lp).toMatch(isJa ? /月単位で解約できます/ : /cancelled month to month/i);
    expect(lp).not.toMatch(/\[kimny (?:確認|confirmation):/);
  });

  it.each(LOCALES)("%s qualifies any unrestricted cancellation wording with the 3-month term (raw text)", (locale) => {
    expect(textGuardHits(locale, rawLegalText(locale)).cancellationMissingTerm).toBe(0);
  });

  it.each(LOCALES)("%s contains no obsolete payment placeholders in either location (raw text)", (locale) => {
    const hits = textGuardHits(locale, rawLegalText(locale));
    expect(hits.deferredPayment).toBe(0);
    expect(hits.deferredPaymentTiming).toBe(0);
  });

  it("has identical ja/en firing counts for EACH raw-text guard", () => {
    expect(textGuardHits("ja", rawLegalText("ja"))).toEqual(textGuardHits("en", rawLegalText("en")));
  });

  // Known inputs assert nonzero hits as well as locale parity: two broken detectors
  // returning zero must not pass. Spaces in the English phrases are intentional.
  it.each([
    {
      name: "unqualified cancellation",
      ja: { cancellation: "いつでも解約できます。", payment: "銀行振込", paymentTiming: "毎月初に請求" },
      en: { cancellation: "You may cancel at any time.", payment: "Bank transfer", paymentTiming: "Billed monthly" },
      expected: { cancellationMissingTerm: 1, deferredPayment: 0, deferredPaymentTiming: 0, pendingMarker: 0, inventedDueDays: 0 },
    },
    {
      name: "deferred disclosure in both payment locations",
      ja: { cancellation: "3ヶ月契約", payment: "支払方法は確定後に記載します。", paymentTiming: "確定後に記載します。" },
      en: { cancellation: "3-month contract", payment: "Payment method will be stated once finalized.", paymentTiming: "Details will be stated once finalized." },
      expected: { cancellationMissingTerm: 0, deferredPayment: 1, deferredPaymentTiming: 1, pendingMarker: 0, inventedDueDays: 0 },
    },
    {
      name: "individually arranged placeholder in both payment locations",
      ja: { cancellation: "3ヶ月契約", payment: "MUED advisory: 個別にご案内します", paymentTiming: "個別にご案内します" },
      en: { cancellation: "3-month contract", payment: "MUED advisory: arranged individually", paymentTiming: "arranged individually" },
      expected: { cancellationMissingTerm: 0, deferredPayment: 1, deferredPaymentTiming: 1, pendingMarker: 0, inventedDueDays: 0 },
    },
    {
      name: "qualified cancellation satisfies the requested implication",
      ja: { cancellation: "3ヶ月契約。お守りプランはいつでも解約できます。", payment: "銀行振込", paymentTiming: "毎月初に請求" },
      en: { cancellation: "3-month contract. The support plan may be cancelled at any time.", payment: "Bank transfer", paymentTiming: "Billed monthly" },
      expected: { cancellationMissingTerm: 0, deferredPayment: 0, deferredPaymentTiming: 0, pendingMarker: 0, inventedDueDays: 0 },
    },
    {
      name: "pending marker left behind in either spelling",
      ja: { cancellation: "3ヶ月契約。[kimny 確認: 中途解約の可否]", payment: "銀行振込", paymentTiming: "毎月初に請求" },
      en: { cancellation: "3-month contract. [kimny confirmation: early termination]", payment: "Bank transfer", paymentTiming: "Billed monthly" },
      expected: { cancellationMissingTerm: 0, deferredPayment: 0, deferredPaymentTiming: 0, pendingMarker: 1, inventedDueDays: 0 },
    },
    {
      name: "invented due-day count in the payment wording",
      ja: { cancellation: "3ヶ月契約", payment: "請求書発行から14日以内にお支払いください。", paymentTiming: "14日以内にお支払いください。" },
      en: { cancellation: "3-month contract", payment: "Please pay within 14 days of the invoice.", paymentTiming: "Payable within 14 days." },
      expected: { cancellationMissingTerm: 0, deferredPayment: 0, deferredPaymentTiming: 0, pendingMarker: 0, inventedDueDays: 1 },
    },
  ])("raw-text detector control: $name fires equally in ja/en", ({ ja, en, expected }) => {
    const jaHits = textGuardHits("ja", ja);
    const enHits = textGuardHits("en", en);
    expect(jaHits).toEqual(expected);
    expect(enHits).toEqual(expected);
    expect(jaHits).toEqual(enHits);
  });

  it("has no retired prices in the entire llms.txt source, including gated content", () => {
    expectNoRetiredPrices(readFileSync(join(process.cwd(), "app/llms.txt/route.ts"), "utf8"));
  });

  it("serves the approved prices and durations in the public llms.txt response", async () => {
    const response = await GET(new NextRequest("https://mued.jp/llms.txt", {
      headers: { host: "mued.jp" },
    }));
    const text = await response.text();
    expect(response.status).toBe(200);
    expectNoRetiredPrices(text);
    const advisorySection = text.slice(text.indexOf("## MUED advisory"));
    for (const price of [100000, 110000, 300000, 330000, 30000, 33000]) {
      expect(compact(advisorySection)).toContain(String(price));
    }
    expect(advisorySection).toContain("初回60分無料");
    expect(advisorySection).toContain("90分");
    expect(advisorySection).toContain("分割可");
    expect(advisorySection).toContain("support@mued.jp");
  });
});
