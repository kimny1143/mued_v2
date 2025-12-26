"use client";

import {
  HeroSection,
  PhilosophySection,
  MuednoteSection,
  RoadmapSection,
  SocialProofSection,
  CtaSection,
  ParallaxBackground,
} from "@/components/features/landing";

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
  return (
    <div className="dark">
      <ParallaxBackground />
      <HeroSection />
      <PhilosophySection />
      <MuednoteSection />
      <RoadmapSection />
      <SocialProofSection />
      <CtaSection />

      {/* Footer */}
      <footer className="bg-[#0F0F1A] py-8 border-t border-white/10 backdrop-blur-2xl relative">
        <div className="container mx-auto px-6 text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} MUED. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
