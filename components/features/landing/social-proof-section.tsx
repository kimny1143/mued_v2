"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Social Proof Section - Landing Page
 *
 * Simple company attribution with link
 */
export function SocialProofSection() {
  const t = useTranslations("landing.social");

  return (
    <section className="py-16 bg-[#0F0F1A]/92 backdrop-blur-xl relative">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-2">{t("developedBy")}</p>
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
    </section>
  );
}
