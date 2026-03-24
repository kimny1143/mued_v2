"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";

const RANKS = [
  { key: "goldenEar", color: "#F5A623", barWidth: "100%" },
  { key: "sharpEar", color: "#7D9B76", barWidth: "85%" },
  { key: "goodEar", color: "#3B82F6", barWidth: "70%" },
  { key: "learning", color: "#8B5CF6", barWidth: "50%" },
  { key: "keepTrying", color: "#94a3b8", barWidth: "30%" },
] as const;

/**
 * MUEDear Ear Ranking Section
 *
 * Visual ranking tiers as a hook: "What's Your Ear Rank?"
 * Placed between Features and Pricing to drive downloads.
 */
export function MuedearEarRankingSection() {
  const t = useTranslations("muedear.earRanking");

  return (
    <section className="py-28 bg-black relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 text-center tracking-tight">
          {t("title")}
        </h2>
        <p className="text-lg text-white/60 mb-16 text-center max-w-xl mx-auto">
          {t("intro")}
        </p>

        {/* Ranking tiers */}
        <div className="max-w-2xl mx-auto space-y-4 mb-16">
          {RANKS.map((rank, index) => (
            <motion.div
              key={rank.key}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: "easeOut",
              }}
            >
              <RankBar
                name={t(`ranks.${rank.key}.name`)}
                score={t(`ranks.${rank.key}.score`)}
                description={t(`ranks.${rank.key}.description`)}
                color={rank.color}
                barWidth={rank.barWidth}
                isTop={index === 0}
              />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <AppStoreButton
            href={MUEDEAR_APP_STORE_URL}
            size="large"
            product="muedear"
            ctaLocation="ear_ranking"
          />
        </div>
      </div>
    </section>
  );
}

interface RankBarProps {
  name: string;
  score: string;
  description: string;
  color: string;
  barWidth: string;
  isTop: boolean;
}

function RankBar({
  name,
  score,
  description,
  color,
  barWidth,
  isTop,
}: RankBarProps) {
  return (
    <div className="group">
      <div className="flex items-center gap-4">
        {/* Score badge */}
        <div
          className="w-14 text-center text-sm font-bold shrink-0"
          style={{ color }}
        >
          {score}
        </div>

        {/* Bar + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <span
              className={`text-base font-semibold ${isTop ? "text-lg" : ""}`}
              style={{ color }}
            >
              {name}
            </span>
            <span className="text-white/40 text-sm hidden sm:inline">
              {description}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              whileInView={{ width: barWidth }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            />
          </div>

          {/* Mobile description */}
          <p className="text-white/40 text-xs mt-1 sm:hidden">{description}</p>
        </div>
      </div>
    </div>
  );
}
