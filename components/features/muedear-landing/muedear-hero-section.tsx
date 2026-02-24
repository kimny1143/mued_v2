"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { MUEDEAR_APP_STORE_URL, GAME_COLORS, type GameKey } from "@/lib/muedear/constants";
import { AppStoreButton } from "@/components/ui/app-store-button";

const GAMES: { key: GameKey; screenshot: string }[] = [
  { key: "mufreq", screenshot: "/images/muedear/mufreq.png" },
  { key: "mucomp", screenshot: "/images/muedear/mucomp-settings.png" },
  { key: "muhorse", screenshot: "/images/muedear/muhorse.png" },
  { key: "muverb", screenshot: "/images/muedear/muverb.png" },
  { key: "mupan", screenshot: "/images/muedear/mupan.png" },
  { key: "murush", screenshot: "/images/muedear/mufreq.png" }, // murush uses mufreq image as placeholder
];

/**
 * MUEDear Hero Section - Spitfire style with game selector
 *
 * Unified hero + game selection:
 * - Title and tagline at top
 * - 5 game thumbnails as selector
 * - Selected game detail below
 * - App Store CTA
 */
export function MuedearHeroSection() {
  const t = useTranslations("muedear");
  const [selectedGame, setSelectedGame] = useState<GameKey>("mufreq");

  const selectedGameData = GAMES.find((g) => g.key === selectedGame)!;
  const accentColor = GAME_COLORS[selectedGame];

  return (
    <section className="min-h-[100dvh] flex flex-col justify-center relative overflow-hidden bg-black">
      <div className="container mx-auto px-6 py-24">
        {/* Header */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight">
          {t("hero.title")}
        </h1>
        <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-xl">
          {t("hero.tagline")}
        </p>

        {/* Game selector - 6 thumbnails */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4 mb-12">
          {GAMES.map(({ key, screenshot }) => (
            <GameThumbnail
              key={key}
              gameKey={key}
              screenshot={screenshot}
              selected={selectedGame === key}
              onClick={() => setSelectedGame(key)}
            />
          ))}
        </div>

        {/* Selected game detail */}
        <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
          {/* Image */}
          <div className="relative aspect-video rounded-xl overflow-hidden">
            <Image
              src={selectedGameData.screenshot}
              alt={t(`games.${selectedGame}.name`)}
              fill
              className="object-cover"
              priority
            />
            {/* Accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: accentColor }}
            />
          </div>

          {/* Text */}
          <div>
            <p
              className="text-sm font-medium mb-2 uppercase tracking-wide"
              style={{ color: accentColor }}
            >
              {t(`games.${selectedGame}.category`)}
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: accentColor }}
            >
              {t(`games.${selectedGame}.name`)}
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              {t(`games.${selectedGame}.description`)}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <AppStoreButton href={MUEDEAR_APP_STORE_URL} size="large" />
          <p className="text-white/50 text-sm max-w-md">
            {t("hero.description")}
          </p>
        </div>
      </div>
    </section>
  );
}

interface GameThumbnailProps {
  gameKey: GameKey;
  screenshot: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * Game thumbnail for selector
 * - Selected: full opacity + accent bar
 * - Unselected: reduced opacity
 * - Hover: brightness increase
 */
function GameThumbnail({ gameKey, screenshot, selected, onClick }: GameThumbnailProps) {
  const t = useTranslations(`muedear.games.${gameKey}`);
  const accentColor = GAME_COLORS[gameKey];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left transition-opacity duration-200 ${
        selected ? "opacity-100" : "opacity-50 hover:opacity-80"
      }`}
      aria-label={t("name")}
      aria-pressed={selected}
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-2">
        <Image
          src={screenshot}
          alt={t("name")}
          fill
          className="object-cover transition-all duration-200 group-hover:brightness-110"
        />
        {/* Accent bar - only visible when selected */}
        {selected && (
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: accentColor }}
          />
        )}
      </div>

      {/* Name */}
      <p
        className={`text-sm font-medium truncate ${
          selected ? "text-white" : "text-white/60"
        }`}
      >
        {t("name")}
      </p>
    </button>
  );
}
