"use client";

import { useTranslations } from "next-intl";
import { HooAnimated } from "./hoo-animated";

/**
 * Meet Hoo Bridge Section
 *
 * Lightweight bridge between MUEDear and MUEDlobe that introduces Hoo
 * so users understand MUEDlobe's value proposition.
 */
export function MeetHooSection() {
  const t = useTranslations("meetHoo");

  return (
    <section className="py-20 bg-[#0a0a0a]">
      <div className="container mx-auto px-6">
        <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-6">
          <HooAnimated
            width={80}
            height={80}
            disableAnimations
          />
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {t("title")}
            </h2>
            <p className="text-white/60 text-base leading-relaxed">
              {t("description")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
