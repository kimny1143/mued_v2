import { ArrowRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { CtaButton } from "@/components/ui/cta-button";

/**
 * Brand CTA Section - MUED Brand Landing Page
 *
 * Final call to action with dual paths:
 * - MUEDnote -> /sign-up
 * - MUEDear -> App Store
 */
export function BrandCtaSection() {
  const t = useTranslations("landing.brand.cta");

  return (
    <section className="py-24 relative">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-[#0F0F1A]/80 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t("title")}
          </h2>

          {/* Description */}
          <p className="text-lg text-white/80 mb-10">
            {t("description")}
          </p>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* MUEDnote CTA */}
            <CtaButton variant="indigo" href="/sign-up">
              {t("muednote")}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </CtaButton>

            {/* MUEDear CTA */}
            <CtaButton variant="amber" href={MUEDEAR_APP_STORE_URL} external>
              {t("muedear")}
              <ExternalLink className="w-5 h-5" />
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}
