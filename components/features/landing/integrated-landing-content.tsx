"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { BrandHeroSection } from "./brand-hero-section";
import { HeroSection } from "./hero-section";
import { PhilosophySection } from "./philosophy-section";
// LP簡素化: MUEDlobe/MeetHoo/GrowthPreview非表示 (2026-02-24)
// import { GrowthPreviewSection } from "./growth-preview-section";
// import { MeetHooSection } from "./meet-hoo-section";
// import { MuedlobeHeroSection } from "@/components/features/muedlobe-landing/muedlobe-hero-section";
// import { MuedlobeOverviewSection } from "@/components/features/muedlobe-landing/muedlobe-overview-section";
import { SocialProofSection } from "./social-proof-section";
import { DeveloperStorySection } from "./developer-story-section";
import { ClaudeCodeTemplateSection } from "./claude-code-template-section";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { MuedearHeroSection } from "@/components/features/muedear-landing/muedear-hero-section";
import { MuedearFeaturesSection } from "@/components/features/muedear-landing/muedear-features-section";
import { MuedearPricingSection } from "@/components/features/muedear-landing/muedear-pricing-section";
import { MuedearEarRankingSection } from "@/components/features/muedear-landing/muedear-ear-ranking-section";
import { MuedialHeroSection } from "@/components/features/muedial-landing/muedial-hero-section";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { ArrowUp, ChevronLeft, ChevronRight, ExternalLink, Music, Ear, Headphones, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { MUEDNOTE_APP_STORE_URL } from "@/lib/muednote/constants";
import { trackCtaClick, trackEvent } from "@/lib/analytics/gtag";
import { GUMROAD_CLAUDE_CODE_TEMPLATE_URL } from "@/lib/gumroad/constants";

const GUMROAD_TEMPLATE_URL = `${GUMROAD_CLAUDE_CODE_TEMPLATE_URL}?utm_source=mued&utm_medium=web&utm_campaign=landing_page_v2&utm_content=section_b`;

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
export function IntegratedLandingContent({
  freeCampaignActive = false,
}: {
  freeCampaignActive?: boolean;
}) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isV2 = searchParams.get("cta") === "v2";

  return (
    <div className="dark">
      {/* Solid dark background - content is the focus */}
      <div className="fixed inset-0 -z-10 bg-[#0f0f0f]" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6">
        <div className="container mx-auto flex items-center justify-end gap-4">
          <a
            href="https://dial.mued.jp"
            className="text-sm text-amber-400/80 hover:text-amber-400 transition-colors font-medium"
          >
            MUEDial
          </a>
          <Link
            href="/sign-in"
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            {locale === "ja" ? "ログイン" : "Log In"}
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Brand Hero - Quick intro */}
      <BrandHeroSection />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* MUEDear Section */}
      <section id="muedear" className="relative">
        <MuedearHeroSection />
        <MuedearFeaturesSection />
        <MuedearEarRankingSection />
        <MuedearPricingSection />
        <SectionNav
          prevHref="#"
          prevLabel={locale === "ja" ? "トップへ" : "Back to Top"}
          nextHref="#muedial"
          nextLabel="MUEDial"
          showPrevIcon={false}
        />
      </section>

      {/* MUEDial Section */}
      <section id="muedial" className="relative">
        <MuedialHeroSection freeCampaignActive={freeCampaignActive} />
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
        <SectionNav
          prevHref="#muedial"
          prevLabel="MUEDial"
          nextHref="#"
          nextLabel={locale === "ja" ? "トップへ" : "Back to Top"}
          showNextIcon={false}
        />
      </section>

      {/* Social Proof */}
      <SocialProofSection />

      {/* Developer Story */}
      <DeveloperStorySection />

      {/* Claude Code Template Section (層A) - v2 variant only */}
      {isV2 && <ClaudeCodeTemplateSection />}

      {/* Final CTA - Both Products */}
      <FinalCtaSection isV2={isV2} />

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

      {/* MUEDial button */}
      <button
        onClick={() => scrollToSection("muedial")}
        className="
          w-10 h-10 rounded-full
          bg-[#1a1a1a] border border-amber-500/30
          text-amber-400/70 hover:text-amber-300 hover:bg-[#222]
          transition-colors duration-200
          flex items-center justify-center
        "
        aria-label="Go to MUEDial"
        title="MUEDial"
      >
        <Headphones className="w-4 h-4" />
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
 *
 * isV2: when true, adds a 4th button for Claude Code Template (層B)
 */
function FinalCtaSection({ isV2 = false }: { isV2?: boolean }) {
  const t = useTranslations("landing.brand.cta");
  const tTemplate = useTranslations("landing.brand.claudeCodeTemplate");

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

          <div className="flex flex-col sm:flex-row flex-wrap gap-6 justify-center items-center">
            <AppStoreButton href={MUEDEAR_APP_STORE_URL} color="amber" size="large" product="muedear" ctaLocation="final_cta" />
            <a
              href="https://dial.mued.jp"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("muedial", "final_cta")}
              className="inline-flex items-center px-5 py-3 bg-transparent border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black font-medium rounded-[var(--radius-lg)] transition-colors duration-200"
            >
              {t("muedial.button")}
            </a>
            <AppStoreButton href={MUEDNOTE_APP_STORE_URL} color="indigo" size="large" product="muednote" ctaLocation="final_cta" />
            {isV2 && (
              <a
                href={GUMROAD_TEMPLATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent({
                    action: "cta_click",
                    params: {
                      product: "claude_code_template",
                      location: "final_cta",
                      variant: "v2",
                    },
                  })
                }
                className="inline-flex items-center gap-2 px-5 py-3 bg-transparent border-2 border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-black font-medium rounded-[var(--radius-lg)] transition-colors duration-200"
              >
                {tTemplate("ctaFinalSection")}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
