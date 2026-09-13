"use client";

import { useTranslations } from "next-intl";
import { AdvisoryPrimaryCta } from "./advisory-primary-cta";

// CONTACT — the closing single CTA (same booking flow).
export function AdvisoryCtaSection() {
  const t = useTranslations("advisory.footerCta");

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#865109]">Contact</p>
        <h2 className="mb-4 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <p className="mb-8 text-[15px] leading-[1.9] text-neutral-600">{t("description")}</p>
        <AdvisoryPrimaryCta label={t("cta")} />
      </div>
    </section>
  );
}
