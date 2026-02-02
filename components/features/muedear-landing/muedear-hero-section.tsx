"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { AppStoreButton } from "@/components/ui/app-store-button";

/**
 * MUEDear Hero Section - Spitfire style
 *
 * Image is the hero. Minimal text.
 * Large app screenshot takes center stage.
 */
export function MuedearHeroSection() {
  const t = useTranslations("muedear.hero");

  return (
    <section className="min-h-[100dvh] flex items-center relative overflow-hidden bg-black">
      <div className="container mx-auto px-6 py-24">
        {/* Title - left aligned, bold */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight">
          {t("title")}
        </h1>
        <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-xl">
          {t("tagline")}
        </p>

        {/* Hero image - app screenshot grid showing the product */}
        <div className="relative mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Main featured screenshot */}
            <div className="col-span-2 row-span-2 relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="/images/muedear/mufreq.png"
                alt="MuFreQ - EQ Training"
                fill
                className="object-cover"
                priority
              />
              {/* Accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#F97316]" />
            </div>

            {/* Secondary screenshots */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                src="/images/muedear/mucomp-settings.png"
                alt="MuComp - Compression Training"
                fill
                className="object-cover"
              />
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#EF4444]" />
            </div>

            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                src="/images/muedear/muverb.png"
                alt="MuVerb - Reverb Training"
                fill
                className="object-cover"
              />
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#8B5CF6]" />
            </div>

            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                src="/images/muedear/mupan.png"
                alt="MuPan - Panning Training"
                fill
                className="object-cover"
              />
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#06B6D4]" />
            </div>

            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#0f0f0f] flex items-center justify-center">
              {/* 5th slot: CTA */}
              <div className="text-center p-4">
                <p className="text-white/60 text-sm mb-3">5 training games</p>
                <AppStoreButton href={MUEDEAR_APP_STORE_URL} size="small" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA - large, prominent */}
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <AppStoreButton href={MUEDEAR_APP_STORE_URL} size="large" />
          <p className="text-white/50 text-sm max-w-md">
            {t("description")}
          </p>
        </div>
      </div>
    </section>
  );
}
