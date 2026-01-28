import Image from "next/image";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";
import { Ear, Moon, BookOpen, Sparkles } from "lucide-react";

/**
 * MUEDear Mascot Section
 *
 * Introduces Hoo the owl mascot.
 */
export function MuedearMascotSection() {
  const t = useTranslations("muedear.mascot");

  return (
    <section className="py-24 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section title */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t("title")}
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              {t("description")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Hoo logo */}
            <div className="flex items-center justify-center">
              <div className="w-64 h-64 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center p-8">
                <div className="text-center">
                  <Image
                    src="/logo.png"
                    alt="Hoo"
                    width={180}
                    height={180}
                    className="mx-auto drop-shadow-lg"
                  />
                  <p className="text-white/60 text-sm mt-4">Hoo</p>
                </div>
              </div>
            </div>

            {/* Why an owl? */}
            <div className="space-y-4">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Ear className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t("hearing.title")}</h3>
                    <p className="text-sm text-white/70">{t("hearing.description")}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Moon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t("nocturnal.title")}</h3>
                    <p className="text-sm text-white/70">{t("nocturnal.description")}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t("wise.title")}</h3>
                    <p className="text-sm text-white/70">{t("wise.description")}</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Future updates */}
          <div className="mt-12">
            <GlassCard className="p-6 text-center max-w-lg mx-auto">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {t("future.title")}
              </h3>
              <p className="text-sm text-white/70">
                {t("future.description")}
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
