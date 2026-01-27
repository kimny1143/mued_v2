import Image from "next/image";
import { ArrowRight, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { CtaButton } from "@/components/ui/cta-button";

/**
 * CTA Section - Landing Page
 *
 * Hoo-centric closing message
 * Warm, inviting tone
 */
export function CtaSection() {
  const t = useTranslations("landing.cta");

  return (
    <section className="py-32 bg-[#0F0F1A]/80 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Launch announcement badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 badge-indigo rounded-full text-sm font-medium mb-8">
            <Bell className="w-4 h-4" />
            {t("badge")}
          </div>

          {/* Hoo image */}
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Hoo"
              width={100}
              height={100}
              className="mx-auto drop-shadow-lg"
            />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 whitespace-pre-line">
            {t("title")}
          </h2>

          <p className="text-lg md:text-xl text-white/90 mb-10 leading-relaxed whitespace-pre-line">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CtaButton variant="indigo" href="/sign-up" className="px-10">
              {t("button")}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}
