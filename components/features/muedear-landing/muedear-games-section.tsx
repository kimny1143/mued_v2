import Image from "next/image";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";
import { GAME_COLORS, type GameKey } from "@/lib/muedear/constants";

const GAMES: { key: GameKey; screenshot: string }[] = [
  { key: "mufreq", screenshot: "/images/muedear/mufreq.png" },
  { key: "mucomp", screenshot: "/images/muedear/mucomp-settings.png" },
  { key: "murush", screenshot: "/images/muedear/mufreq.png" }, // Uses same EQ interface
  { key: "muverb", screenshot: "/images/muedear/muverb.png" },
  { key: "mupan", screenshot: "/images/muedear/mupan.png" },
];

/**
 * MUEDear Games Section
 *
 * Showcases the 5 ear training games with screenshots and color-coded cards.
 */
export function MuedearGamesSection() {
  const t = useTranslations("muedear.games");

  return (
    <section className="py-24 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
          {t("title")}
        </h2>
        <p className="text-lg text-white/80 mb-16 text-center">
          {t("intro")}
        </p>

        {/* Game select screenshot */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
            <Image
              src="/images/muedear/game-select.png"
              alt="Game Selection Screen"
              width={1311}
              height={603}
              className="rounded-xl w-full h-auto"
            />
          </div>
        </div>

        {/* Game cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map(({ key, screenshot }) => (
            <GameCard key={key} gameKey={key} screenshot={screenshot} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface GameCardProps {
  gameKey: GameKey;
  screenshot: string;
}

function GameCard({ gameKey, screenshot }: GameCardProps) {
  const t = useTranslations(`muedear.games.${gameKey}`);
  const accentColor = GAME_COLORS[gameKey];

  return (
    <GlassCard className="relative overflow-hidden group">
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: accentColor }}
      />

      {/* Screenshot thumbnail */}
      <div className="mb-4 rounded-lg overflow-hidden border border-white/10">
        <Image
          src={screenshot}
          alt={t("name")}
          width={655}
          height={301}
          className="w-full h-auto"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xl font-bold"
          style={{ color: accentColor }}
        >
          {t("name")}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
            {t("category")}
          </span>
          <span className="text-xs text-white/80">{t("difficulty")}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-white/80 text-sm leading-relaxed">
        {t("description")}
      </p>
    </GlassCard>
  );
}
