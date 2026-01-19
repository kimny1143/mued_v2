"use client";

import { Clock, Music, Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Philosophy Section - Landing Page
 *
 * MVP features: Rest tracker + Sound reaction + Voice memo
 * No AI conversation - just a cute companion
 */
export function PhilosophySection() {
  const t = useTranslations("landing.philosophy");

  return (
    <section className="py-32 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        {/* Intro - softer tone */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            {t("title")}
          </h2>

          <div className="text-lg md:text-xl text-slate-400 leading-relaxed space-y-6">
            <p className="whitespace-pre-line">{t("intro")}</p>
          </div>
        </div>

        {/* Three features - MVP accurate */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t("features.rest.title")}</h3>
            </div>
            <p className="text-slate-400">{t("features.rest.description")}</p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t("features.sound.title")}</h3>
            </div>
            <p className="text-slate-400">{t("features.sound.description")}</p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t("features.voice.title")}</h3>
            </div>
            <p className="text-slate-400">{t("features.voice.description")}</p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
