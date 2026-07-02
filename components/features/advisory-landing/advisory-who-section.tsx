"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

// ABOUT — square 顔写真 (kimny, 480x480) + kimny real-name block.
export function AdvisoryWhoSection() {
  const t = useTranslations("advisory.who");

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-600">About</p>
        <div className="grid gap-10 md:grid-cols-[200px_1fr] md:gap-14">
          <div className="aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-neutral-100">
            <Image
              src="/images/advisory-kimny-480.png"
              alt={t("title")}
              width={480}
              height={480}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="mb-6 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
            <p className="mb-4 text-[15px] leading-[1.9] text-neutral-600">{t("body1")}</p>
            <p className="mb-6 text-[15px] leading-[1.9] text-neutral-600">{t("body2")}</p>
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
        </div>
      </div>
    </section>
  );
}
