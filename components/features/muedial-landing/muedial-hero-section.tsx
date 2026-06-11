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
export function MuedialHeroSection({
  freeCampaignActive = false,
}: {
  freeCampaignActive?: boolean;
}) {
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
              src="/muedial-hoo-mixing-console.webp"
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

        {/* free15 first-run campaign promo — gated server-side (campaign live + spots remain) */}
        {freeCampaignActive && (
          <div
            className="mb-10 p-5 rounded-[var(--radius-lg)] border-2 border-amber-400/40 bg-amber-500/10 max-w-xl"
            data-testid="muedjp-free15-promo"
          >
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-amber-400 text-black mb-3">
              {t("free15Badge")}
            </span>
            <p className="text-white font-semibold mb-1">{t("free15Headline")}</p>
            <p className="text-white/70 text-sm mb-4">{t("free15Sub")}</p>
            <a
              href="https://dial.mued.jp/dial?utm_source=mued&utm_medium=web&utm_campaign=free15&utm_content=muedjp_muedial"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("muedial", "free15")}
              className="inline-flex items-center px-5 py-2.5 bg-amber-400 text-black font-semibold rounded-[var(--radius-lg)] hover:bg-amber-300 transition-colors"
            >
              {t("free15Cta")}
            </a>
          </div>
        )}

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
