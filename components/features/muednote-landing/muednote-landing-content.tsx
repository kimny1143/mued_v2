"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import {
  HeroSection,
  PhilosophySection,
  MuednoteSection,
  GrowthPreviewSection,
  CtaSection,
  SocialProofSection,
  ParallaxBackground,
} from "@/components/features/landing";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

/**
 * MUEDnote Landing Page Content
 *
 * Production companion app with Hoo mascot.
 * Reuses existing components from the original landing page.
 *
 * Sections:
 * 1. HeroSection - Hoo with speech bubble animation
 * 2. PhilosophySection - "What Hoo Can Do"
 * 3. MuednoteSection - iOS app introduction
 * 4. GrowthPreviewSection - Upcoming features (DAW Log, Conversation)
 * 5. SocialProofSection - Developer quote
 * 6. CtaSection - Final CTA
 */
export function MuednoteLandingContent() {
  const locale = useLocale();

  return (
    <div className="dark">
      <ParallaxBackground />

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

      <HeroSection />
      <PhilosophySection />
      <MuednoteSection />
      <GrowthPreviewSection />
      <SocialProofSection />
      <CtaSection />

      {/* Footer */}
      <footer className="bg-[#0F0F1A] py-8 border-t border-white/10 backdrop-blur-2xl relative">
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
