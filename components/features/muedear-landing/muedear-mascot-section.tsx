import Image from "next/image";
import { useTranslations } from "next-intl";
import { Ear, Moon, BookOpen, Sparkles } from "lucide-react";

/**
 * MUEDear Mascot Section
 *
 * Introduces Hoo the owl mascot.
 */
export function MuedearMascotSection() {
  const t = useTranslations("muedear.mascot");

  return (
    <section className="py-28 bg-[var(--bg-base)] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

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
              <div className="w-64 h-64 bg-[#111] border border-white/5 rounded-3xl flex items-center justify-center p-8">
                <div className="text-center">
                  <Image
                    src="/logo.webp"
                    alt="Hoo"
                    width={180}
                    height={180}
                    className="mx-auto"
                  />
                  <p className="text-white/50 text-sm mt-4">Hoo</p>
                </div>
              </div>
            </div>

            {/* Why an owl? */}
            <div className="space-y-4">
              <div className="bg-[#111] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                    <Ear className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t("hearing.title")}</h3>
                    <p className="text-sm text-white/60">{t("hearing.description")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                    <Moon className="w-5 h-5 text-white/70" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t("nocturnal.title")}</h3>
                    <p className="text-sm text-white/60">{t("nocturnal.description")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white/70" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t("wise.title")}</h3>
                    <p className="text-sm text-white/60">{t("wise.description")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Future updates */}
          <div className="mt-12">
            <div className="bg-[#111] border border-white/5 rounded-xl p-6 text-center max-w-lg mx-auto hover:border-white/10 transition-colors">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {t("future.title")}
              </h3>
              <p className="text-sm text-white/60">
                {t("future.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
