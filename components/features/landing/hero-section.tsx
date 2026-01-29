"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HooAnimated } from "./hoo-animated";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-media-query";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { MUEDNOTE_APP_STORE_URL } from "@/lib/muednote/constants";

interface HeroSectionProps {
  onGetStarted?: () => void;
}

/**
 * Hero Section - Landing Page
 *
 * Hoo (owl mascot) centered design
 * Focus on companion experience, not feature list
 */
export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const t = useTranslations("landing.hero");
  const hooPhrases = t.raw("hooPhrases") as string[];
  const [phrase, setPhrase] = useState(hooPhrases[0]);
  const [showBubble, setShowBubble] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  // Get next phrase (called before animation to determine which animation to play)
  const getNextPhrase = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * hooPhrases.length);
    return hooPhrases[randomIndex];
  }, [hooPhrases]);

  // Show the phrase bubble (called after bounce with pre-determined phrase)
  const handleBounce = useCallback((selectedPhrase: string) => {
    // Clear existing timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Use the phrase passed from HooAnimated
    setPhrase(selectedPhrase);

    // Show bubble
    setShowBubble(true);

    // Hide after 6 seconds
    hideTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 6000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="min-h-screen flex items-center relative overflow-hidden pt-16 lg:pt-0">
      {/* Overlay for text readability - 60% opacity for WCAG contrast */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left: Copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Logo & tagline */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{t("title")}</h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8 font-light">
              {t("tagline")}
            </p>

            {/* Hoo-centric copy - rest tracker focus */}
            <p className="text-2xl md:text-3xl text-white/90 max-w-xl mb-6 leading-relaxed">
              {t("headline")}
            </p>
            <p className="text-lg text-white/80 max-w-xl mb-12 whitespace-pre-line">
              {t("description")}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <AppStoreButton href={MUEDNOTE_APP_STORE_URL} variant="indigo" />
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-lg text-lg font-medium transition-colors cursor-pointer"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* Right: Hoo with speech bubble */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Speech bubble - appears when Hoo bounces */}
              <AnimatePresence>
                {showBubble && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 lg:left-auto lg:right-1/2 lg:translate-x-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 lg:px-5 lg:py-3 border border-white/20 origin-bottom z-10"
                  >
                    <p className="text-white text-sm lg:text-base font-medium whitespace-nowrap">{phrase}</p>
                    {/* Bubble tail - points to Hoo's head */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 lg:left-auto lg:right-4 lg:translate-x-0 w-4 h-4 bg-white/10 border-r border-b border-white/20 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hoo logo - animated SVG */}
              <HooAnimated
                width={280}
                height={280}
                className="drop-shadow-2xl"
                onBounce={handleBounce}
                getNextPhrase={getNextPhrase}
                currentPhrase={showBubble ? phrase : undefined}
                isMobile={isMobile}
              />
              {/* Hoo introduction */}
              <p className="text-center text-white text-sm mt-4">
                {t("hooIntro")}
              </p>
            </div>
          </div>
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
