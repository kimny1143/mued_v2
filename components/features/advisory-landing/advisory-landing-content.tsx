"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AdvisoryHeroSection } from "./advisory-hero-section";
import { AdvisoryWhoSection } from "./advisory-who-section";
import { AdvisoryStepsSection } from "./advisory-steps-section";
import { AdvisoryPricingSection } from "./advisory-pricing-section";
import { AdvisoryMyWaySection } from "./advisory-my-way-section";
import { AdvisoryFaqSection } from "./advisory-faq-section";
import { AdvisoryCtaSection } from "./advisory-cta-section";

export function AdvisoryLandingContent() {
  const locale = useLocale();
  const t = useTranslations("advisory.footer");

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
        <AdvisoryHeroSection />
        <AdvisoryWhoSection />
        <AdvisoryStepsSection />
        <AdvisoryPricingSection />
        <AdvisoryMyWaySection />
        <AdvisoryFaqSection />
        <AdvisoryCtaSection />
      </main>

      <footer className="bg-[#0a0a0a] py-10 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-white/40 text-sm">
              {t("operator")}／{t("contact")}
            </p>
            <nav className="flex items-center gap-6">
              <Link
                href={`/${locale}/tokushoho`}
                className="text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                {t("legalLink")}
              </Link>
              <Link
                href={`/${locale}/privacy`}
                className="text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                {t("privacyLink")}
              </Link>
            </nav>
            <p className="text-white/30 text-sm pt-4 border-t border-white/5">
              {t("signature")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
