"use client";

import { useTranslations } from "next-intl";

// APPROACH — a quiet section on a faint tint (#f8fafc).
export function AdvisoryMyWaySection() {
  const t = useTranslations("advisory.myWay");

  return (
    <section className="border-t border-neutral-100 bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-600">Approach</p>
        <h2 className="mb-6 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <p className="text-[15px] leading-[1.9] text-neutral-600">{t("body")}</p>
      </div>
    </section>
  );
}
