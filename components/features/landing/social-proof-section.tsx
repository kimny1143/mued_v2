"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface SocialProofSectionProps {
  /**
   * Use brand-level translation keys instead of product-specific ones
   * @default true
   */
  useBrandKeys?: boolean;
}

/**
 * Social Proof Section - Landing Page
 *
 * App Store status + Developer quote + Company attribution
 */
export function SocialProofSection({ useBrandKeys = true }: SocialProofSectionProps) {
  const t = useTranslations(useBrandKeys ? "landing.brand.social" : "landing.social");

  return (
    <section className="py-28 bg-[#0a0a0a] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl mx-auto"
        >
          {/* MUEDnote App Store badge + origin-story quote removed 2026-07-07 — full delist
              from home 製品面 (kimny/Chief). Only the glasswerks company attribution is retained. */}
          {/* Company Attribution */}
          <div className="text-center">
            <p className="text-subtle text-sm mb-2">{t("developedBy")}</p>
            <a
              href="https://www.glasswerks.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <span className="text-section font-extrabold tracking-tight">glasswerks inc.</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
