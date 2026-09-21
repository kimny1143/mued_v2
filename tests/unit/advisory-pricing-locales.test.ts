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
  advisory: { pricing: { values: Record<string, unknown> } };
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

  it.each(LOCALES)("%s uses identical payment-method wording in both legal locations", (locale) => {
    const legal = messages(locale).tokushoho;
    const globalMethod = legal.payment.value.split("\n").find((line) => line.startsWith("MUED advisory: "));
    expect(globalMethod).toBe(`MUED advisory: ${legal.advisory.paymentTiming.value.split("\n")[0]}`);
    expect(globalMethod).toMatch(locale === "ja" ? /有料3メニュー共通/ : /all three paid services/);
    expect(globalMethod).toMatch(locale === "ja" ? /未確定.*\[kimny 確認:/ : /not yet confirmed.*\[kimny confirmation:/);
    expect(globalMethod).toMatch(locale === "ja" ? /請求書\/銀行振込/ : /invoice\/bank transfer/);
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
    expect(program).toMatch(isJa ? /\[kimny 確認:.*中途解約の可否/ : /\[kimny confirmation:.*early termination is permitted/);
    expect(program).toMatch(isJa ? /未払残額/ : /unpaid balance/);
    expect(program).not.toMatch(isJa ? /翌契約月以降の課金は停止/ : /billing stops from the following contract month/);
    expect(support).toMatch(isJa ? /月単位で解約できます/ : /may be cancelled month to month/);
    expect(support).toMatch(isJa ? /当月分の日割り返金はありません/ : /no prorated refund/);
    expect(spot).toMatch(isJa ? /前日まで/ : /day before/);
    expect(spot).toMatch(isJa ? /当日キャンセル又は無断不参加/ : /same-day cancellation or no-show/);
    expect(legal.cancellation.description).not.toMatch(isJa ? /月額サービスはいつでも解約できます/ : /Monthly services may be cancelled at any time/);
    expect(legal.paymentTiming.value).toMatch(isJa ? /分割の回数・各回の金額と支払期日/ : /number of installments, amount and due date of each installment/);
    expect(legal.price.description).toContain("10%");
    expect(legal.contact.value).toBe("support@mued.jp");
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
