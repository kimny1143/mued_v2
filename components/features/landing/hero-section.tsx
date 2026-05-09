"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { HooAnimated } from "./hoo-animated";
import { useTranslations } from "next-intl";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { MUEDNOTE_APP_STORE_URL } from "@/lib/muednote/constants";

/**
 * MUEDnote Hero Section
 *
 * Image background + Hoo with speech bubble animations
 */
export function HeroSection() {
  const t = useTranslations("landing.hero");
  const hooPhrases = t.raw("hooPhrases") as string[];
  const [phrase, setPhrase] = useState(hooPhrases[0]);
  const [showBubble, setShowBubble] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getNextPhrase = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * hooPhrases.length);
    return hooPhrases[randomIndex];
  }, [hooPhrases]);

  const handleBounce = useCallback((selectedPhrase: string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setPhrase(selectedPhrase);
    setShowBubble(true);
    hideTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="min-h-[100dvh] relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-muednote-studio.webp"
          alt="Music production studio"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-[100dvh] flex items-center">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-3 tracking-tight">
                {t("title")}
              </h1>
              <p className="text-lg sm:text-xl text-white/70 mb-4">
                {t("tagline")}
              </p>
              <p className="text-base text-white/50 mb-8 max-w-md">
                {t("headline")}
              </p>

              {/* CTA - App Store only (LP簡素化: ログインボタン削除 2026-02-24) */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <AppStoreButton href={MUEDNOTE_APP_STORE_URL} color="white" size="large" product="muednote" ctaLocation="hero" />
              </div>
            </div>

            {/* Right: Hoo with speech bubble */}
            <div className="flex justify-center lg:justify-end">
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
                      className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black/80 rounded-xl px-4 py-2 border border-white/10 origin-bottom z-10"
                      style={{ width: "max-content", maxWidth: "260px" }}
                    >
                      <p className="text-white text-sm font-medium whitespace-pre-line">{phrase}</p>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/80 border-r border-b border-white/10 rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <HooAnimated
                  width={240}
                  height={240}
                  className="sm:w-[300px] sm:h-[300px]"
                  onBounce={handleBounce}
                  getNextPhrase={getNextPhrase}
                  currentPhrase={showBubble ? phrase : undefined}
                />
                <p className="text-center text-white/50 text-xs mt-3">
                  {t("hooIntro")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
