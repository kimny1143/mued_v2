import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";
import { Zap, Cpu, Waves, Sliders } from "lucide-react";

const FEATURE_ICONS = {
  realtime: Zap,
  hardware: Cpu,
  convolution: Waves,
  settings: Sliders,
} as const;

type FeatureKey = keyof typeof FEATURE_ICONS;

const FEATURES: FeatureKey[] = ["realtime", "hardware", "convolution", "settings"];

/**
 * MUEDear Features Section
 *
 * Highlights the DSP capabilities and professional features.
 */
export function MuedearFeaturesSection() {
  const t = useTranslations("muedear.features");

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
          {t("title")}
        </h2>
        <p className="text-lg text-white/80 mb-16 text-center max-w-2xl mx-auto">
          {t("intro")}
        </p>

        {/* Feature cards grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {FEATURES.map((featureKey) => (
            <FeatureCard key={featureKey} featureKey={featureKey} />
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
    <GlassCard>
      {/* Icon and title */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
          <p className="text-sm text-indigo-400 font-medium">{t("subtitle")}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-white/80 text-sm leading-relaxed">
        {t("description")}
      </p>
    </GlassCard>
  );
}
