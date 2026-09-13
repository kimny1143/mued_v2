"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Timer, Layers, SlidersHorizontal, Target } from "lucide-react";

const FEATURE_ICONS = {
  quickPlay: Timer,
  coverage: Layers,
  difficulty: SlidersHorizontal,
  practical: Target,
} as const;

type FeatureKey = keyof typeof FEATURE_ICONS;

const FEATURES: FeatureKey[] = ["quickPlay", "coverage", "difficulty", "practical"];

/**
 * MUEDear Features Section
 *
 * User-experience focused: quick play, coverage, difficulty, practical value.
 */
export function MuedearFeaturesSection() {
  const t = useTranslations("muedear.features");

  return (
    <section className="py-28 bg-[var(--bg-base)] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 text-center tracking-tight">
          {t("title")}
        </h2>
        <p className="text-lg text-white/80 mb-16 text-center max-w-2xl mx-auto">
          {t("intro")}
        </p>

        {/* Feature cards grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {FEATURES.map((featureKey, index) => (
            <motion.div
              key={featureKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
            >
              <FeatureCard featureKey={featureKey} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  featureKey: FeatureKey;
}

function FeatureCard({ featureKey }: FeatureCardProps) {
  const t = useTranslations(`muedear.features.${featureKey}`);
  const Icon = FEATURE_ICONS[featureKey];

  return (
    <div className="bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
      {/* Icon and title */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
          <p className="text-sm text-amber-400/80 font-medium">{t("subtitle")}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-white/70 text-sm leading-relaxed">
        {t("description")}
      </p>
    </div>
  );
}
