"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
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
 * Landing Content - MUEDnote Landing Page
 *
 * Design philosophy:
 * - Dark mode first
 * - Glassmorphism
 * - MUEDnote: 判断を資産にするツール
 *
 * LP Structure (1/7 launch):
 * - Pain: 判断が消える問題提起
 * - Solution: MUEDnoteの機能紹介
 * - Roadmap: 将来展望
 * - CTA: 行動喚起
 */
export function LandingContent() {
  const locale = useLocale();

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
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} MUED. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link
                href={`/${locale}/privacy`}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                {locale === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
              </Link>
              <Link
                href={`/${locale}/support`}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
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
