import { ExternalLink, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Social Proof Section - Landing Page
 *
 * App Store status + Developer quote + Company attribution
 */
export function SocialProofSection() {
  const t = useTranslations("landing.social");

  return (
    <section className="py-16 bg-[#0F0F1A]/92 backdrop-blur-xl relative">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          {/* App Store Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 badge-green border border-green-500/20 rounded-full">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-medium">{t("badge")}</span>
            </div>
          </div>

          {/* Developer Quote */}
          <blockquote className="text-center mb-8">
            <p className="text-lg md:text-xl text-white/80 italic mb-2">
              {t("quote")}
            </p>
            <cite className="text-subtle text-sm not-italic">— {t("author")}</cite>
          </blockquote>

          {/* Company Attribution */}
          <div className="text-center">
            <p className="text-subtle text-sm mb-2">{t("developedBy")}</p>
            <a
              href="https://www.glasswerks.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <span className="text-2xl md:text-3xl font-bold">glasswerks inc.</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
