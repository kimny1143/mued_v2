import Image from "next/image";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * MUEDnote Section - Landing Page
 *
 * iOS app introduction with Hoo-centric messaging
 * Companion experience, not feature list
 */
export function MuednoteSection() {
  const t = useTranslations("landing.muednote");

  return (
    <section className="py-20 bg-[#1A1A2E]/90 backdrop-blur-lg relative">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Description */}
          <div>
            <div className="inline-block px-3 py-1 badge-indigo rounded-full text-sm font-medium mb-6">
              {t("badge")}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t("title")}
            </h2>

            <div className="text-lg text-white/80 leading-relaxed mb-8 space-y-4">
              <p>{t("description")}</p>
              <p className="text-white/90 whitespace-pre-line">{t("highlight")}</p>
            </div>

            {/* Simple feature hints - not a bullet list */}
            <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
              <p className="text-white/80 text-sm leading-relaxed">
                💡 {t("hint")}
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://apps.apple.com/jp/app/muednote/id6757840889"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0F0F1A] px-6 py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {t("ctaPrimary")}
              </a>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 bg-white/5 text-white/80 border border-white/10 px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors cursor-pointer"
              >
                {t("ctaSecondary")}
              </a>
            </div>
          </div>

          {/* Right: App preview with Hoo */}
          <div className="flex justify-center lg:justify-end">
            <GlassCard className="w-72 h-[500px] flex items-center justify-center relative overflow-hidden">
              <div className="text-center">
                {/* Hoo in phone mockup style */}
                <Image
                  src="/logo.png"
                  alt="Hoo"
                  width={120}
                  height={120}
                  className="mx-auto mb-4 drop-shadow-lg"
                />
                <p className="text-white/80 text-lg font-medium mb-2">{t("preview.greeting")}</p>
                <p className="text-white/80 text-sm">{t("preview.timer")}</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
