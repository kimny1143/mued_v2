"use client";

import { useTranslations } from "next-intl";
import { AdvisoryPrimaryCta } from "./advisory-primary-cta";

// 案C hero: ultra-thin, ultra-large charcoal heading on white; 2-column lead + closing line; CTA.
export function AdvisoryHeroSection() {
  const t = useTranslations("advisory.hero");

  return (
    <section className="px-6 pt-24 pb-20 md:pt-28">
      <div className="mx-auto max-w-5xl">
        <h1 className="max-w-4xl text-4xl font-light leading-[1.4] tracking-tight text-neutral-900 md:text-6xl md:leading-[1.3]">
          {t("title")}
        </h1>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-12">
          <p className="text-[15px] leading-[1.9] text-neutral-600">{t("lead1")}</p>
          <p className="text-[15px] leading-[1.9] text-neutral-600">{t("lead2")}</p>
        </div>
        <p className="mt-6 max-w-3xl text-[15px] leading-[1.9] text-neutral-600">{t("lead3")}</p>

        <div className="mt-12">
          <AdvisoryPrimaryCta label={t("cta")} />
        </div>
      </div>
    </section>
  );
}
