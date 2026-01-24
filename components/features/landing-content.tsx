import Link from "next/link";
import { getLocale } from "next-intl/server";
import {
  HeroSection,
  PhilosophySection,
  MuednoteSection,
  GrowthPreviewSection,
  SocialProofSection,
  CtaSection,
  ParallaxBackground,
} from "@/components/features/landing";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

/**
 * Landing Content - MUEDnote Landing Page (Server Component)
 *
 * Design philosophy:
 * - Dark mode first
 * - Glassmorphism
 * - MUEDnote: 判断を資産にするツール
 *
 * Architecture:
 * - Server Components for static content (Philosophy, MUEDnote, Growth, Social, CTA)
 * - Client Components only for interactive parts (Hero, ParallaxBackground, LocaleSwitcher)
 */
export async function LandingContent() {
  const locale = await getLocale();

  return (
    <div className="dark">
      <ParallaxBackground />

      {/* Header with locale switcher */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6">
        <div className="container mx-auto flex justify-end">
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
