"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { HooAnimated } from "@/components/features/landing/hoo-animated";
import { AppStoreButton } from "@/components/ui/app-store-button";

/**
 * MUEDear Hero Section
 *
 * Layout aligned with MUEDnote hero:
 * - Left: Copy + CTA
 * - Right: Hoo mascot with ear-focused animations
 *
 * Ear animations:
 * 1. Spin → "耳トレ、やってみる？"
 * 2. Bounce → "ほほう、いい耳してるね"
 * 3. Tilt → "実はこれ、耳じゃなくて、羽角 "うかく"なんだよね。"
 */
export function MuedearHeroSection() {
  const t = useTranslations("muedear.hero");
  const [phrase, setPhrase] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show phrase bubble when Hoo triggers animation
  const handleBounce = useCallback((selectedPhrase: string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    setPhrase(selectedPhrase);
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
    <section className="min-h-[100dvh] flex items-center relative overflow-hidden py-12 sm:py-16 lg:py-0">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-12 lg:gap-20">
          {/* Left: Copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Logo & tagline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-2 sm:mb-4">
              {t("title")}
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-white/80 mb-4 sm:mb-8 font-light">
              {t("tagline")}
            </p>

            {/* Hoo-centric copy */}
            <p className="text-sm sm:text-lg text-amber-300 mb-2 sm:mb-4">
              {t("hooIntro")}
            </p>
            <p className="text-sm sm:text-lg text-white/80 max-w-xl mb-6 sm:mb-12 whitespace-pre-line leading-relaxed">
              {t("description")}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <AppStoreButton href={MUEDEAR_APP_STORE_URL} className="text-sm sm:text-base" />
            </div>
          </div>

          {/* Right: Hoo mascot with speech bubble */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Speech bubble */}
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
                    className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-2 sm:px-5 sm:py-3 border border-white/20 origin-bottom z-10"
                    style={{ width: "max-content", maxWidth: "280px" }}
                  >
                    <p className="text-white text-xs sm:text-sm lg:text-base font-medium text-left whitespace-pre-line">{phrase}</p>
                    {/* Bubble tail - between center and right edge, pointing down to Hoo's head */}
                    <div className="absolute -bottom-2 right-1/4 w-4 h-4 bg-white/10 border-r border-b border-white/20 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              <HooAnimated
                width={160}
                height={160}
                className="drop-shadow-2xl sm:w-[280px] sm:h-[280px]"
                muedearMode
                onBounce={handleBounce}
              />
              {/* Hoo introduction */}
              <p className="text-center text-white/80 text-xs sm:text-sm mt-2 sm:mt-4">
                Hoo - Your ear training companion
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator - hidden on mobile */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
