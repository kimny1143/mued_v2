"use client";

import { motion } from "framer-motion";
import { HooAnimated } from "./hoo-animated";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CtaButton } from "@/components/ui/cta-button";

/**
 * Brand Hero Section - MUED Brand Landing Page
 *
 * Design principles (from MUED_SITE_INSTRUCTIONS.md):
 * - Hoo is the HERO - large, glowing, static (animations in product sections)
 * - Clear visual hierarchy: Title → Hoo → Primary CTA → Secondary link
 * - MUEDnote = primary (filled button), MUEDear = secondary (text link)
 * - Solid dark background (handled by parent), no competing visuals
 */
export function BrandHeroSection() {
  const t = useTranslations("landing.brand.hero");

  return (
    <section className="min-h-[100dvh] flex items-center relative overflow-hidden py-16 lg:py-0">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Brand Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-6xl md:text-8xl font-bold text-white mb-2 sm:mb-3"
          >
            {t("title")}
          </motion.h1>

          {/* Tagline - subtle, not competing with Hoo */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm sm:text-base md:text-lg text-white/50 mb-8 sm:mb-12 font-light tracking-wide"
          >
            {t("tagline")}
          </motion.p>

          {/* Hoo - THE HERO: large, glowing, static (animations in product sections) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mb-4 sm:mb-6 relative"
          >
            {/* Glow effect behind Hoo */}
            <div className="absolute inset-0 blur-3xl bg-white/10 rounded-full scale-150" />
            <HooAnimated
              width={240}
              height={240}
              className="relative z-10 drop-shadow-[0_0_40px_rgba(255,255,255,0.15)] sm:w-[320px] sm:h-[320px]"
              disableAnimations
            />
          </motion.div>

          {/* Hoo intro text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-white/60 text-sm sm:text-base mb-8 sm:mb-10"
          >
            {t("hooIntro")}
          </motion.p>

          {/* CTA hierarchy: Primary button + Secondary text link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col items-center gap-4 sm:gap-5"
          >
            {/* MUEDnote CTA - Primary (filled button) */}
            <CtaButton
              variant="indigo"
              href="#muednote"
              className="px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-medium"
            >
              {t("exploreMuednote")}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
            </CtaButton>

            {/* MUEDear CTA - Secondary (text link, subtle) */}
            <a
              href="#muedear"
              className="text-white/50 hover:text-white/80 text-sm sm:text-base transition-colors duration-200 flex items-center gap-1 group"
            >
              {t("exploreMuedear")}
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator - hidden on mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block"
      >
        <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/30 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}
