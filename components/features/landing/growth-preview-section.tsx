import Image from "next/image";
import { Monitor, MessageCircle, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Growth Preview Section - Landing Page
 *
 * Shows what Hoo is learning to do (upcoming features)
 * Simplified: quote only, no feature list
 */
export function GrowthPreviewSection() {
  const t = useTranslations("landing.growth");

  return (
    <section className="py-20 bg-[#1A1A2E]/80 backdrop-blur-lg relative">
      <div className="container mx-auto px-6">
        {/* Header with Hoo */}
        <div className="flex flex-col items-center text-center mb-12">
          <Image
            src="/logo.png"
            alt="Hoo"
            width={64}
            height={64}
            className="mb-4 drop-shadow-lg"
          />
          <h2 className="text-section text-white mb-3">
            {t("title")}
          </h2>
          <p className="text-base text-white/80 max-w-md">
            {t("subtitle")}
          </p>
        </div>

        {/* Upcoming features - compact cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* DAW Log Integration */}
          <GlassCard className="relative">
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 badge-amber text-xs font-medium rounded-full">
                <Wrench className="w-3 h-3" />
                {t("badge")}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t("daw.title")}</h3>
            </div>

            <p className="text-white/80 text-sm leading-relaxed">
              {t("daw.quote")}
            </p>
          </GlassCard>

          {/* Conversation with Hoo */}
          <GlassCard className="relative">
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 badge-amber text-xs font-medium rounded-full">
                <Wrench className="w-3 h-3" />
                {t("badge")}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t("conversation.title")}</h3>
            </div>

            <p className="text-white/80 text-sm leading-relaxed">
              {t("conversation.quote")}
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
