"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Clock, Mic, Music2, Gamepad2, Settings, Gift } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";

/**
 * Products Showcase Section - MUED Brand Landing Page
 *
 * Shows MUEDnote and MUEDear side by side
 * - 3 features each (Miller's Law)
 * - MUEDnote: indigo accent
 * - MUEDear: amber accent
 */
export function ProductsShowcaseSection() {
  const t = useTranslations("landing.brand.products");
  const locale = useLocale();

  return (
    <section id="products" className="py-24 relative">
      {/* Background overlay for readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-white/80 max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* MUEDnote Card */}
          <GlassCard className="flex flex-col h-full">
            {/* Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm font-medium rounded-full border border-indigo-500/30">
                <Music2 className="w-3.5 h-3.5" />
                {t("muednote.badge")}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-2">MUEDnote</h3>

            {/* Tagline */}
            <p className="text-white/80 mb-6">{t("muednote.tagline")}</p>

            {/* Features List */}
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-indigo-400" />
                </div>
                {t("muednote.features.rest")}
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-indigo-400" />
                </div>
                {t("muednote.features.voice")}
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-4 h-4 text-indigo-400" />
                </div>
                {t("muednote.features.sound")}
              </li>
            </ul>

            {/* Dual CTA - Compact */}
            <div className="flex items-center gap-4">
              {/* Primary: Learn More → Dedicated LP */}
              <Link
                href={`/${locale}/muednote`}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-indigo-400/50 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t("muednote.ctaLearnMore")}
              </Link>
              {/* Secondary: Direct Action → Sign Up */}
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                {t("muednote.ctaStart")}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </GlassCard>

          {/* MUEDear Card */}
          <GlassCard className="flex flex-col h-full">
            {/* Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-sm font-medium rounded-full border border-amber-500/30">
                <Gamepad2 className="w-3.5 h-3.5" />
                {t("muedear.badge")}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-2">MUEDear</h3>

            {/* Tagline */}
            <p className="text-white/80 mb-6">{t("muedear.tagline")}</p>

            {/* Features List */}
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                </div>
                {t("muedear.features.games")}
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-amber-400" />
                </div>
                {t("muedear.features.dsp")}
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-4 h-4 text-amber-400" />
                </div>
                {t("muedear.features.free")}
              </li>
            </ul>

            {/* Dual CTA - Compact */}
            <div className="flex items-center gap-4">
              {/* Primary: Learn More → Dedicated LP */}
              <Link
                href={`/${locale}/muedear`}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-amber-400/50 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t("muedear.ctaLearnMore")}
              </Link>
              {/* Secondary: Direct Action → App Store */}
              <a
                href={MUEDEAR_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                {t("muedear.ctaDownload")}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
