"use client";

import Image from "next/image";
import { Monitor, MessageCircle, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Growth Preview Section - Landing Page
 *
 * Shows what Hoo is learning to do (upcoming features)
 * Uses active voice: "開発中" not "Coming Soon"
 * Hoo speaks in first person about growth
 */
export function GrowthPreviewSection() {
  const t = useTranslations("landing.growth");
  const dawFeatures = t.raw("daw.features") as string[];
  const conversationFeatures = t.raw("conversation.features") as string[];

  return (
    <section className="py-24 bg-[#1A1A2E]/80 backdrop-blur-lg relative">
      <div className="container mx-auto px-6">
        {/* Header with Hoo */}
        <div className="flex flex-col items-center text-center mb-16">
          <Image
            src="/logo.png"
            alt="Hoo"
            width={80}
            height={80}
            className="mb-6 drop-shadow-lg"
          />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-400 max-w-xl">
            {t("subtitle")}
          </p>
        </div>

        {/* Upcoming features grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* DAW Log Integration */}
          <GlassCard className="relative overflow-hidden">
            {/* Badge */}
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                <Wrench className="w-3 h-3" />
                {t("badge")}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                <Monitor className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">{t("daw.title")}</h3>
            </div>

            {/* Hoo's voice */}
            <blockquote className="text-white/90 text-lg mb-4 pl-4 border-l-2 border-indigo-500/50">
              {t("daw.quote")}
            </blockquote>

            <ul className="text-slate-400 text-sm space-y-2">
              {dawFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  {feature}
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* Conversation with Hoo */}
          <GlassCard className="relative overflow-hidden">
            {/* Badge */}
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                <Wrench className="w-3 h-3" />
                {t("badge")}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">{t("conversation.title")}</h3>
            </div>

            {/* Hoo's voice */}
            <blockquote className="text-white/90 text-lg mb-4 pl-4 border-l-2 border-indigo-500/50">
              {t("conversation.quote")}
            </blockquote>

            <ul className="text-slate-400 text-sm space-y-2">
              {conversationFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  {feature}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
