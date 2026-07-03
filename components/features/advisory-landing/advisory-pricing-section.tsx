"use client";

import { useTranslations, useLocale } from "next-intl";

// PRICING — kimny restructure: the two ENTRY tiers (consult / diagnosis) are the prominent cards
// (this is a "start with a free consult" storefront, not a contract-signing page). The two MONTHLY
// tiers (build / companion) are demoted to a subordinate range panel — figures are a guide, real
// scope is set in the consultation. Prices (tax-inclusive) come verbatim from canonical i18n.
const PROMINENT = ["consult", "diagnosis"] as const;
const MONTHLY = ["build", "companion"] as const;

export function AdvisoryPricingSection() {
  const t = useTranslations("advisory.pricing");
  const locale = useLocale();

  // Subordinate monthly framing. content課 owns the canonical copy (advisory.pricing.monthlyLabel /
  // monthlyNote); until the handoff lands, t.has() falls back so the live section never breaks.
  const monthlyLabel = t.has("monthlyLabel")
    ? t("monthlyLabel")
    : locale === "ja"
      ? "継続してつくる・並走する（月額）"
      : "Ongoing build & companion (monthly)";
  const monthlyNote = t.has("monthlyNote")
    ? t("monthlyNote")
    : locale === "ja"
      ? "金額は目安です。内容により見積もり、詳細は無料相談で決めます。"
      : "Figures are a guide — scoped per engagement; details are set in the free consultation.";

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-600">Pricing</p>
        <h2 className="mb-2 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <p className="mb-10 max-w-2xl text-[15px] leading-[1.9] text-neutral-600">{t("subtitle")}</p>

        {/* Entry tiers — prominent */}
        <div className="grid gap-4 md:grid-cols-2">
          {PROMINENT.map((key) => (
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

        {/* Monthly tiers — subordinate range (figures are a guide; scope set in the consult) */}
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-6">
          <p className="mb-4 text-sm font-semibold text-neutral-700">{monthlyLabel}</p>
          <div className="space-y-3">
            {MONTHLY.map((key) => (
              <div key={key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-sm font-medium text-neutral-800">{t(`${key}.name`)}</span>
                <span className="text-sm font-light tabular-nums text-neutral-600">{t(`${key}.price`)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-[1.8] text-neutral-500">{monthlyNote}</p>
        </div>
      </div>
    </section>
  );
}
