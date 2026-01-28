"use client";

import { motion } from "framer-motion";
import { HooAnimated } from "./hoo-animated";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CtaButton } from "@/components/ui/cta-button";

/**
 * Brand Hero Section - MUED Brand Landing Page
 *
 * Introduces MUED as a brand with two products:
 * - MUEDnote (Production Companion)
 * - MUEDear (Ear Training)
 *
 * Features small Hoo animation without speech bubble
 * Two CTAs following Hick's Law (2 choices)
 */
export function BrandHeroSection() {
  const t = useTranslations("landing.brand.hero");

  return (
    <section className="min-h-screen flex items-center relative overflow-hidden pt-16 lg:pt-0">
      {/* Overlay for text readability - 60% opacity for WCAG contrast */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Brand Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl md:text-7xl font-bold text-white mb-4"
          >
            {t("title")}
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl md:text-2xl text-white/80 mb-4 font-light"
          >
            {t("tagline")}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-white/80 mb-8"
          >
            {t("description")}
          </motion.p>

          {/* Hoo Animation - smaller, centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-4"
          >
            <HooAnimated
              width={200}
              height={200}
              className="drop-shadow-2xl"
            />
          </motion.div>

          {/* Hoo intro text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-white/80 text-sm mb-10"
          >
            {t("hooIntro")}
          </motion.p>

          {/* Dual CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {/* MUEDnote CTA - Primary */}
            <CtaButton variant="indigo" href="#products">
              {t("exploreMuednote")}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </CtaButton>

            {/* MUEDear CTA - Secondary */}
            <CtaButton variant="amber" href="#products">
              {t("exploreMuedear")}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </CtaButton>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
