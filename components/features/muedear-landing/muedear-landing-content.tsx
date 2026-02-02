"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { MuedearHeroSection } from "./muedear-hero-section";
import { MuedearGamesSection } from "./muedear-games-section";
import { MuedearFeaturesSection } from "./muedear-features-section";
import { MuedearAudienceSection } from "./muedear-audience-section";
import { MuedearPricingSection } from "./muedear-pricing-section";
import { MuedearMascotSection } from "./muedear-mascot-section";
import { MuedearFaqSection } from "./muedear-faq-section";
import { MuedearCtaSection } from "./muedear-cta-section";
import { MuedearParallaxBackground } from "./muedear-parallax-background";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

/**
 * MUEDear Landing Page Content
 *
 * Ear training app for music producers and mixing engineers.
 * iOS only (no Google Play).
 */
export function MuedearLandingContent() {
  const locale = useLocale();

  return (
    <div className="dark">
      <MuedearParallaxBackground />

      {/* Header with locale switcher and back to brand */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <Link
            href={`/${locale}`}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            &larr; MUED
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="min-h-screen">
        <MuedearHeroSection />
        <MuedearGamesSection />
        <MuedearFeaturesSection />
        <MuedearAudienceSection />
        <MuedearPricingSection />
        <MuedearMascotSection />
        <MuedearFaqSection />
        <MuedearCtaSection />
      </main>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] py-8 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-subtle text-sm">
              &copy; {new Date().getFullYear()} MUED. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link
                href={`/${locale}/privacy`}
                className="text-subtle hover:text-muted text-sm transition-colors"
              >
                {locale === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
              </Link>
              <Link
                href={`/${locale}/tokushoho`}
                className="text-subtle hover:text-muted text-sm transition-colors"
              >
                {locale === "ja" ? "特定商取引法に基づく表記" : "Legal"}
              </Link>
              <Link
                href={`/${locale}/support`}
                className="text-subtle hover:text-muted text-sm transition-colors"
              >
                {locale === "ja" ? "サポート" : "Support"}
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
