"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { trackCtaClick } from "@/lib/analytics/gtag";

/**
 * MUEDial Hero Section for integrated LP
 *
 * Matches the visual weight of MUEDear/MUEDnote hero sections.
 * Chat mock + CTA to dial.mued.jp
 */
export function MuedialHeroSection() {
  const t = useTranslations("landing.brand.cta.muedial");
  const tLp = useTranslations("dial.lp");

  return (
    <section className="min-h-[80dvh] flex flex-col justify-center relative overflow-hidden bg-black">
      <div className="container mx-auto px-6 py-24">
        {/* Header */}
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight">
          MUED<span className="text-amber-400">ial</span>
        </h2>
        <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-xl">
          {t("tagline")}
        </p>

        {/* Content grid */}
        <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
          {/* Hero image */}
          <div className="relative aspect-video rounded-xl overflow-hidden">
            <Image
              src="/muedial-hoo-mixing-console.jpg"
              alt="MUEDial - AI Mixing"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
          </div>

          {/* Chat mock */}
          <div className="space-y-4">
            <p className="text-sm text-white/40 uppercase tracking-wide mb-6">
              {tLp("chatMockLabel")}
            </p>

            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-white/10 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p className="text-white text-sm">{tLp("chatMockUser1")}</p>
              </div>
            </div>

            {/* Hoo response */}
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                <span className="text-amber-400 text-xs font-bold">H</span>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                <p className="text-white/80 text-sm">{tLp("chatMockHoo1")}</p>
              </div>
            </div>

            {/* User reply */}
            <div className="flex justify-end">
              <div className="bg-white/10 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p className="text-white text-sm">{tLp("chatMockUser2")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <a
            href="https://dial.mued.jp"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCtaClick("muedial", "hero")}
            className="inline-flex items-center px-6 py-3 bg-amber-400 text-black font-semibold rounded-[var(--radius-lg)] hover:bg-amber-300 transition-colors"
          >
            {t("button")}
          </a>
          <p className="text-white/50 text-sm max-w-md">
            {t("description")}
          </p>
        </div>
      </div>
    </section>
  );
}
