"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { GAME_COLORS, type GameKey } from "@/lib/muedear/constants";

const GAMES: { key: GameKey; screenshot: string }[] = [
  { key: "mufreq", screenshot: "/images/muedear/mufreq.png" },
  { key: "mucomp", screenshot: "/images/muedear/mucomp-settings.png" },
  { key: "murush", screenshot: "/images/muedear/mufreq.png" },
  { key: "muverb", screenshot: "/images/muedear/muverb.png" },
  { key: "mupan", screenshot: "/images/muedear/mupan.png" },
];

/**
 * MUEDear Games Section - Spitfire style
 *
 * Image is the hero. Minimal text.
 */
export function MuedearGamesSection() {
  const t = useTranslations("muedear.games");

  return (
    <section className="py-32 bg-black">
      <div className="container mx-auto px-6">
        {/* Section title - left aligned like Spitfire */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 tracking-tight">
          {t("title")}
        </h2>

        {/* Product grid - 4 columns like Spitfire */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {GAMES.slice(0, 4).map(({ key, screenshot }) => (
            <GameCard key={key} gameKey={key} screenshot={screenshot} />
          ))}
        </div>

        {/* Fifth game - full width feature */}
        <div className="mt-8">
          <GameCardLarge gameKey="mupan" screenshot="/images/muedear/mupan.png" />
        </div>
      </div>
    </section>
  );
}

interface GameCardProps {
  gameKey: GameKey;
  screenshot: string;
}

/**
 * Spitfire-style product card
 * - Image takes 80% of card
 * - Name + one line description only
 * - Hover: slight brightness increase
 */
function GameCard({ gameKey, screenshot }: GameCardProps) {
  const t = useTranslations(`muedear.games.${gameKey}`);
  const accentColor = GAME_COLORS[gameKey];

  return (
    <div className="group cursor-pointer">
      {/* Image container - dominant */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-3">
        <Image
          src={screenshot}
          alt={t("name")}
          fill
          className="object-cover transition-all duration-300 group-hover:brightness-110"
        />
        {/* Accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Text - minimal */}
      <h3
        className="text-lg font-semibold mb-1"
        style={{ color: accentColor }}
      >
        {t("name")}
      </h3>
      <p className="text-white/60 text-sm line-clamp-1">
        {t("category")}
      </p>
    </div>
  );
}

/**
 * Large featured card for the last game
 */
function GameCardLarge({ gameKey, screenshot }: GameCardProps) {
  const t = useTranslations(`muedear.games.${gameKey}`);
  const accentColor = GAME_COLORS[gameKey];

  return (
    <div className="group cursor-pointer grid md:grid-cols-2 gap-6 items-center">
      {/* Image - large */}
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <Image
          src={screenshot}
          alt={t("name")}
          fill
          className="object-cover transition-all duration-300 group-hover:brightness-110"
        />
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Text */}
      <div>
        <h3
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{ color: accentColor }}
        >
          {t("name")}
        </h3>
        <p className="text-white/70 text-lg">
          {t("description")}
        </p>
      </div>
    </div>
  );
}
