"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { BrandHeroSection } from "./brand-hero-section";
import { HeroSection } from "./hero-section";
import { PhilosophySection } from "./philosophy-section";
import { GrowthPreviewSection } from "./growth-preview-section";
import { SocialProofSection } from "./social-proof-section";
import { DeveloperStorySection } from "./developer-story-section";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { MuedearHeroSection } from "@/components/features/muedear-landing/muedear-hero-section";
import { MuedearFeaturesSection } from "@/components/features/muedear-landing/muedear-features-section";
import { MuedearPricingSection } from "@/components/features/muedear-landing/muedear-pricing-section";
import { MeetHooSection } from "./meet-hoo-section";
import { MuedlobeHeroSection } from "@/components/features/muedlobe-landing/muedlobe-hero-section";
import { MuedlobeOverviewSection } from "@/components/features/muedlobe-landing/muedlobe-overview-section";
import { CtaButton } from "@/components/ui/cta-button";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Music, Ear, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { MUEDNOTE_APP_STORE_URL } from "@/lib/muednote/constants";

/**
 * Integrated Landing Page - Single page with all products
 *
 * Structure:
 * 1. Brand Hero - MUED introduction with scroll CTAs
 * 2. MUEDnote Section - Full hero + features (id="muednote")
 * 3. MUEDear Section - Full hero + games/features (id="muedear")
 * 4. Social Proof
 * 5. Final CTA
 */
export function IntegratedLandingContent() {
  const locale = useLocale();
  const t = useTranslations("landing");

  return (
    <div className="dark">
      {/* Solid dark background - content is the focus */}
      <div className="fixed inset-0 -z-10 bg-[#0f0f0f]" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6">
        <div className="container mx-auto flex justify-end">
          <LocaleSwitcher />
        </div>
      </header>

      {/* Brand Hero - Quick intro */}
      <BrandHeroSection />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* MUEDear Section - Primary product */}
      <section id="muedear" className="relative">
        <MuedearHeroSection />
        <MuedearFeaturesSection />
        <MuedearPricingSection />
        <SectionNav
          prevHref="#"
          prevLabel={locale === "ja" ? "トップへ" : "Back to Top"}
          nextHref="#muedlobe"
          nextLabel="MUEDlobe"
          showPrevIcon={false}
        />
      </section>

      {/* Meet Hoo Bridge */}
      <MeetHooSection />

      {/* MUEDlobe Section */}
      <section id="muedlobe" className="relative">
        <MuedlobeHeroSection />
        <MuedlobeOverviewSection />
        <SectionNav
          prevHref="#muedear"
          prevLabel="MUEDear"
          nextHref="#muednote"
          nextLabel="MUEDnote"
        />
      </section>

      {/* MUEDnote Section */}
      <section id="muednote">
        <HeroSection />
        <PhilosophySection />
        <GrowthPreviewSection />
        <SectionNav
          prevHref="#muedlobe"
          prevLabel="MUEDlobe"
          nextHref="#"
          nextLabel={locale === "ja" ? "トップへ" : "Back to Top"}
          showNextIcon={false}
        />
      </section>

      {/* Social Proof */}
      <SocialProofSection />

      {/* Developer Story */}
      <DeveloperStorySection />

      {/* Final CTA - Both Products */}
      <FinalCtaSection />

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

/**
 * Floating Navigation - Always visible quick nav
 * Appears after scrolling past the hero section
 */
function FloatingNav() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past ~80% of viewport height (hero section)
      const shouldShow = window.scrollY > window.innerHeight * 0.8;
      setIsVisible(shouldShow);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        flex flex-col gap-2
        transition-all duration-300
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      {/* Top button */}
      <button
        onClick={scrollToTop}
        className="
          w-10 h-10 rounded-full
          bg-[#1a1a1a] border border-white/10
          text-white/60 hover:text-white hover:bg-[#222]
          transition-colors duration-200
          flex items-center justify-center
        "
        aria-label="Back to top"
        title="Top"
      >
        <ArrowUp className="w-4 h-4" />
      </button>

      {/* MUEDnote button */}
      <button
        onClick={() => scrollToSection("muednote")}
        className="
          w-10 h-10 rounded-full
          bg-[#1a1a1a] border border-indigo-500/30
          text-indigo-400 hover:text-indigo-300 hover:bg-[#222]
          transition-colors duration-200
          flex items-center justify-center
        "
        aria-label="Go to MUEDnote"
        title="MUEDnote"
      >
        <Music className="w-4 h-4" />
      </button>

      {/* MUEDlobe button */}
      <button
        onClick={() => scrollToSection("muedlobe")}
        className="
          w-10 h-10 rounded-full
          bg-[#1a1a1a] border border-violet-500/30
          text-violet-400 hover:text-violet-300 hover:bg-[#222]
          transition-colors duration-200
          flex items-center justify-center
        "
        aria-label="Go to MUEDlobe"
        title="MUEDlobe"
      >
        <Brain className="w-4 h-4" />
      </button>

      {/* MUEDear button */}
      <button
        onClick={() => scrollToSection("muedear")}
        className="
          w-10 h-10 rounded-full
          bg-[#1a1a1a] border border-amber-500/30
          text-amber-400 hover:text-amber-300 hover:bg-[#222]
          transition-colors duration-200
          flex items-center justify-center
        "
        aria-label="Go to MUEDear"
        title="MUEDear"
      >
        <Ear className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Section Navigation - Navigate between sections (at section ends)
 */
interface SectionNavProps {
  prevHref: string;
  prevLabel: string;
  nextHref: string;
  nextLabel: string;
  showPrevIcon?: boolean;
  showNextIcon?: boolean;
}

function SectionNav({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  showPrevIcon = true,
  showNextIcon = true,
}: SectionNavProps) {
  return (
    <div className="py-8 bg-[#0a0a0a]">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <a
            href={prevHref}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            {showPrevIcon ? (
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            ) : (
              <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
            )}
            <span className="text-sm font-medium">{prevLabel}</span>
          </a>

          <a
            href={nextHref}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <span className="text-sm font-medium">{nextLabel}</span>
            {showNextIcon ? (
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            ) : (
              <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
            )}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Final CTA Section - Both products
 */
function FinalCtaSection() {
  const t = useTranslations("landing.brand.cta");

  return (
    <section className="py-32 bg-[#0a0a0a] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-section text-white mb-4 font-extrabold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-subhead text-white/80 mb-12">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <AppStoreButton href={MUEDEAR_APP_STORE_URL} color="amber" size="large" />
            <CtaButton variant="violet" href="/lobe">
              {t("muedlobe")}
            </CtaButton>
            <AppStoreButton href={MUEDNOTE_APP_STORE_URL} color="indigo" size="large" />
          </div>
        </div>
      </div>
    </section>
  );
}
