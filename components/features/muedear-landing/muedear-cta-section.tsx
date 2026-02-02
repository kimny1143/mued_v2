import { useTranslations } from "next-intl";
import { Smartphone, Headphones } from "lucide-react";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { AppStoreButton } from "@/components/ui/app-store-button";

/**
 * MUEDear CTA Section
 *
 * Final call-to-action with App Store download.
 */
export function MuedearCtaSection() {
  const t = useTranslations("muedear.cta");
  const tFooter = useTranslations("muedear.footer");

  return (
    <section className="py-28 bg-[#0a0a0a] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Section title */}
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t("title")}
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-12 font-medium">
            {t("headline")}
          </p>

          {/* App Store Button */}
          <AppStoreButton href={MUEDEAR_APP_STORE_URL} size="large" className="mb-12" />

          {/* System requirements */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 inline-block">
            <h3 className="text-sm font-semibold text-white/60 mb-4">
              {t("requirements.title")}
            </h3>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-white/60" />
                <span>{t("requirements.ios")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-white/60" />
                <span>{t("requirements.headphones")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer tagline */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-white/60 text-sm">{tFooter("tagline")}</p>
        </div>
      </div>
    </section>
  );
}
