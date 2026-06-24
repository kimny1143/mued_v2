"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { AiMixingHeroSection } from "./ai-mixing-hero-section";
import { AiMixingStepsSection } from "./ai-mixing-steps-section";
import { AiMixingUtamitaSection } from "./ai-mixing-utamita-section";
import { AiMixingComparisonSection } from "./ai-mixing-comparison-section";
import { AiMixingPricingSection } from "./ai-mixing-pricing-section";
import { AiMixingFaqSection } from "./ai-mixing-faq-section";
import { AiMixingCtaSection } from "./ai-mixing-cta-section";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export function AiMixingLandingContent() {
  const locale = useLocale();

  return (
    <div className="dark min-h-screen bg-[#0a0a0a]">
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
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

      <main>
        <AiMixingHeroSection />
        <AiMixingStepsSection />
        <AiMixingUtamitaSection />
        <AiMixingComparisonSection />
        <AiMixingPricingSection />
        <AiMixingFaqSection />
        <AiMixingCtaSection />
      </main>

      <footer className="bg-[#0a0a0a] py-8 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">
              &copy; {new Date().getFullYear()} MUED. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link
                href={`/${locale}/privacy`}
                className="text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                {locale === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
              </Link>
              <Link
                href={`/${locale}/tokushoho`}
                className="text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                {locale === "ja" ? "特定商取引法に基づく表記" : "Legal"}
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
