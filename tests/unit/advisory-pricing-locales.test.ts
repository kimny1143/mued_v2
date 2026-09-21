import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["ja", "en"] as const;
const CANONICAL_PRICES = {
  initialConsultationYen: 0,
  programMonthlyYen: 100000,
  programTotalYen: 300000,
  guardianMonthlyYen: 30000,
  spotYen: 30000,
} as const;
const PRICE_KEYS = Object.keys(CANONICAL_PRICES) as (keyof typeof CANONICAL_PRICES)[];
const RETIRED_PRICES = [250000, 220000, 440000] as const;

function advisory(locale: (typeof LOCALES)[number]): Record<string, unknown> {
  const messages = JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as { advisory: Record<string, unknown> };

  return messages.advisory;
}

function priceValues(locale: (typeof LOCALES)[number]): Record<string, unknown> {
  const pricing = advisory(locale).pricing as { values?: Record<string, unknown> } | undefined;
  return pricing?.values ?? {};
}

describe("advisory pricing — locale parity", () => {
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

  it.each(LOCALES)("%s no longer contains the retired 6/29 prices", (locale) => {
    const compactNamespace = JSON.stringify(advisory(locale)).replace(/[\s,，]/g, "");

    for (const retired of RETIRED_PRICES) {
      expect(compactNamespace).not.toContain(String(retired));
    }
  });
});
