"use client";

import { useTranslations } from "next-intl";

// PROCESS — 4 numbered steps (01–04, Sora tabular-nums, teal), clean editorial (no icons).
const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const;

export function AdvisoryStepsSection() {
  const t = useTranslations("advisory.steps");

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-600">Process</p>
        <h2 className="mb-12 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {STEP_KEYS.map((key, i) => (
            <div key={key}>
              <div className="mb-3 text-3xl font-light tabular-nums text-teal-600">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mb-2 text-base font-semibold text-neutral-900">{t(`${key}.title`)}</h3>
              <p className="text-sm leading-[1.9] text-neutral-600">{t(`${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
