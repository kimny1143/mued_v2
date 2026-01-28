import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";
import { Check, Ban, Bell, Flame, Target } from "lucide-react";

/**
 * MUEDear Pricing Section
 *
 * Free tier details and anti-addiction design philosophy.
 */
export function MuedearPricingSection() {
  const t = useTranslations("muedear.pricing");

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
          {t("title")}
        </h2>
        <p className="text-lg text-white/80 mb-16 text-center">
          {t("intro")}
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free tier details */}
          <GlassCard>
            <h3 className="text-xl font-semibold text-white mb-6">
              {t("free.title")}
            </h3>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <span className="text-white/80">{t("free.games")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <span className="text-white/80">{t("free.modes")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <span className="text-white/80">{t("free.ads")}</span>
              </li>
            </ul>

            {/* Quote */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <h4 className="text-sm font-semibold text-white/60 mb-3">
                {t("why.title")}
              </h4>
              <blockquote className="text-white/80 text-sm italic leading-relaxed">
                {t("why.quote")}
              </blockquote>
            </div>
          </GlassCard>

          {/* Anti-addiction design */}
          <GlassCard>
            <h3 className="text-xl font-semibold text-white mb-6">
              {t("antiAddiction.title")}
            </h3>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
                <span className="text-white/80">{t("antiAddiction.noScroll")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
                <span className="text-white/80">{t("antiAddiction.noNotifications")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Flame className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
                <span className="text-white/80">{t("antiAddiction.noStreak")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Target className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                <span className="text-white">{t("antiAddiction.focused")}</span>
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
