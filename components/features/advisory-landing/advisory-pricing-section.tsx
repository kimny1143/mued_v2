"use client";

import { useTranslations } from "next-intl";

const PLAN_KEYS = ["consult", "program", "guardian", "spot"] as const;

export function AdvisoryPricingSection() {
  const t = useTranslations("advisory.pricing");

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#865109]">Pricing</p>
        <h2 className="mb-2 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <p className="max-w-2xl text-[15px] leading-[1.9] text-neutral-600">{t("subtitle")}</p>
        <p className="mb-10 mt-2 text-xs leading-[1.8] text-neutral-500">{t("taxNote")}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {PLAN_KEYS.map((key) => (
            <div
              key={key}
              className={`rounded-2xl border p-6 ${
                key === "consult"
                  ? "border-amber-500/40 bg-amber-50/50"
                  : "border-neutral-200 bg-[var(--brand-paper)]"
              }`}
            >
              <h3 className="text-base font-semibold text-neutral-900">{t(`${key}.name`)}</h3>
              <p className="mb-3 mt-2 text-xl font-light tabular-nums text-[#865109]">{t(`${key}.price`)}</p>
              <p className="text-sm leading-[1.9] text-neutral-600">{t(`${key}.what`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-6">
          <p className="text-sm font-semibold text-neutral-800">{t("cancellationTitle")}</p>
          <p className="mt-2 text-xs leading-[1.8] text-neutral-600">{t("cancellation")}</p>
        </div>
      </div>
    </section>
  );
}
