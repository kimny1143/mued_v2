"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Brand Hero Section - MUED Brand Landing Page
 *
 * Spitfire style: Image is the hero.
 * Full-bleed studio illustration with Hoo, minimal text overlay.
 */
export function BrandHeroSection() {
  const t = useTranslations("landing.brand.hero");

  return (
    <section className="min-h-[100dvh] relative overflow-hidden">
      {/* Hero Image - Full bleed */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-hoo-studio.webp"
          alt="Hoo in the studio"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay - darker for less busy feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      </div>

      {/* Content - bottom aligned */}
      <div className="absolute inset-0 flex items-end">
        <div className="container mx-auto px-6 pb-24 sm:pb-32">
          <div className="max-w-2xl">
            {/* Brand Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight">
              {t("title")}
            </h1>

            {/* Tagline */}
            <p className="text-lg sm:text-xl text-white/80 mb-8 font-light">
              {t("tagline")}
            </p>

            {/* CTA buttons - Spitfire style: compact */}
            <div className="flex flex-col sm:flex-row items-start gap-3">
              {/* Primary CTA - white button, compact */}
              <a
                href="#muedear"
                className="inline-flex items-center justify-center gap-2 bg-white text-black px-5 py-2.5 rounded-md text-sm font-medium hover:bg-white/90 transition-colors"
              >
                {t("exploreMuedear")}
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* LP簡素化: MUEDlobe非表示 (2026-02-24)
              <a
                href="#muedlobe"
                className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors group py-2.5"
              >
                {t("exploreMuedlobe")}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </a>
              */}
              <a
                href="#muednote"
                className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors group py-2.5"
              >
                {t("exploreMuednote")}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:block">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/40 rounded-full" />
        </div>
      </div>
    </section>
  );
}
