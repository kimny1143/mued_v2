"use client";

import { useTranslations } from "next-intl";

// ABOUT — text-forward real-name block (no avatar). The kimny headshot was removed
// per kimny (a premium advisory storefront reads cleaner without a photo). The
// "Atsushi Kimura" Person entity stays in the page JSON-LD for SEO/LLMO grounding.
// max-w-3xl matches the other prose sections (my-way / faq / cta) for page rhythm.
export function AdvisoryWhoSection() {
  const t = useTranslations("advisory.who");

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-600">About</p>
        <h2 className="mb-6 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <p className="mb-4 whitespace-pre-line text-[15px] leading-[1.9] text-neutral-600">{t("body1")}</p>
        <p className="mb-8 text-[15px] leading-[1.9] text-neutral-600">{t("body2")}</p>
        <ul className="space-y-2 text-sm">
          <li className="text-neutral-500">
            {t("recordLabel")}：
            <a href={t("recordHref")} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
              {t("recordText")}
            </a>
          </li>
          <li className="text-neutral-500">
            {t("profileLabel")}：
            <a href={t("profileHref")} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
              {t("profileText")}
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
