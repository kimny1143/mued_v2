"use client";

import { useTranslations } from "next-intl";

// PRICING — 4 tiers as capsule cards; the price is the emphasized figure (Sora, tabular-nums, teal).
// "まず相談" is highlighted (teal). Prices come verbatim from canonical i18n.
const TIERS = ["consult", "diagnosis", "build", "companion"] as const;

export function AdvisoryPricingSection() {
  const t = useTranslations("advisory.pricing");

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-600">Pricing</p>
        <h2 className="mb-2 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <p className="mb-10 max-w-2xl text-[15px] leading-[1.9] text-neutral-600">{t("subtitle")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {TIERS.map((key) => (
            <div
              key={key}
              className={`rounded-2xl border p-6 ${
                key === "consult" ? "border-teal-500/40 bg-teal-50/50" : "border-neutral-200 bg-white"
              }`}
            >
              <h3 className="text-base font-semibold text-neutral-900">{t(`${key}.name`)}</h3>
              <p className="mb-3 mt-2 text-xl font-light tabular-nums text-teal-700">{t(`${key}.price`)}</p>
              <p className="text-sm leading-[1.9] text-neutral-600">{t(`${key}.what`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
