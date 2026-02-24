"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CtaButton } from "@/components/ui/cta-button";
import type { GameType } from "@/types/muedlobe";
import { GAME_META } from "@/lib/muedlobe/constants";

const GAMES: GameType[] = [
  "tone-sequence",
  "mental-math",
  "symbol-match",
  "code-fill",
  "word-bridge",
  "pattern-complete",
  "focus-flow",
];

const GAME_IMAGES: Record<GameType, string> = {
  "tone-sequence": "/images/muedlobe/tone-sequence.webp",
  "mental-math": "/images/muedlobe/mental-math.webp",
  "symbol-match": "/images/muedlobe/symbol-match.webp",
  "code-fill": "/images/muedlobe/code-fill.webp",
  "word-bridge": "/images/muedlobe/word-bridge.webp",
  "pattern-complete": "/images/muedlobe/pattern-complete.webp",
  "focus-flow": "/images/muedlobe/focus-flow.webp",
};

export function MuedlobeHeroSection() {
  const t = useTranslations("muedlobe");
  const [selectedGame, setSelectedGame] = useState<GameType>("tone-sequence");

  const meta = GAME_META[selectedGame];

  return (
    <section className="min-h-[100dvh] flex flex-col justify-center relative overflow-hidden bg-black">
      <div className="container mx-auto px-6 py-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">
            {t("hero.title")}
          </h1>
          <span className="px-3 py-1 text-xs font-mono font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full">
            {t("hero.pilotBadge")}
          </span>
        </div>
        <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-xl">
          {t("hero.tagline")}
        </p>

        {/* Game selector - 7 cards */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 md:gap-4 mb-12">
          {GAMES.map((type) => {
            const selected = selectedGame === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedGame(type)}
                className={`group relative text-left transition-opacity duration-200 ${
                  selected ? "opacity-100" : "opacity-50 hover:opacity-80"
                }`}
                aria-label={t(`games.${type}.name`)}
                aria-pressed={selected}
              >
                <div
                  className={`relative aspect-video rounded-lg mb-2 border overflow-hidden transition-colors ${
                    selected
                      ? "border-violet-500/40"
                      : "border-white/10 group-hover:border-white/20"
                  }`}
                >
                  <Image
                    src={GAME_IMAGES[type]}
                    alt={t(`games.${type}.name`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 25vw, 14vw"
                  />
                  {selected && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500" />
                  )}
                </div>
                <p
                  className={`text-[10px] sm:text-xs font-medium truncate ${
                    selected ? "text-white" : "text-white/40"
                  }`}
                >
                  {t(`games.${type}.name`)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selected game detail */}
        <div className="grid md:grid-cols-2 gap-8 items-start mb-12">
          {/* Game image */}
          <div className="relative aspect-video rounded-xl overflow-hidden border border-violet-500/20">
            <Image
              src={GAME_IMAGES[selectedGame]}
              alt={t(`games.${selectedGame}.name`)}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
          </div>

          {/* Text */}
          <div>
            <p className="text-sm font-medium mb-2 uppercase tracking-wide text-violet-400">
              {t(`games.${selectedGame}.variable`)}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-violet-300">
              {t(`games.${selectedGame}.name`)}
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-3">
              {t(`games.${selectedGame}.description`)}
            </p>
            <p className="text-white/40 text-sm">
              {meta.duration}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <CtaButton variant="violet" href="/lobe" size="large">
            {t("hero.ctaPrimary")}
          </CtaButton>
          <p className="text-white/50 text-sm max-w-md">
            {t("hero.description")}
          </p>
        </div>
      </div>
    </section>
  );
}
