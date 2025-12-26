"use client";

import {
  HeroSection,
  PhilosophySection,
  MuednoteSection,
  SocialProofSection,
  CtaSection,
  ParallaxBackground,
} from "@/components/features/landing";

/**
 * Landing Content - MUED Landing Page
 *
 * Design philosophy:
 * - Dark mode first
 * - Glassmorphism
 * - AI-era creator support platform
 *
 * Psychological effects:
 * - Framing: Creativity as "choosing"
 * - Cognitive dissonance resolution: AI anxiety → human role clarity
 * - Social proof: glasswerks credentials
 * - Loss aversion: CTA emphasis
 */
export function LandingContent() {
  return (
    <div className="dark">
      <ParallaxBackground />
      <HeroSection />
      <PhilosophySection />
      <MuednoteSection />
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
