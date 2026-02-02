"use client";

import Image from "next/image";
import { Monitor, MessageCircle, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

/**
 * Growth Preview Section - Landing Page
 *
 * Shows what Hoo is learning to do (upcoming features)
 * Simplified: quote only, no feature list
 */
export function GrowthPreviewSection() {
  const t = useTranslations("landing.growth");

  return (
    <section className="py-28 bg-[#0a0a0a] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        {/* Header with Hoo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center mb-12"
        >
          <Image
            src="/logo.png"
            alt="Hoo"
            width={64}
            height={64}
            className="mb-4"
          />
          <h2 className="text-section text-white mb-3 font-extrabold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-base text-white/80 max-w-md">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Upcoming features - compact cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* DAW Log Integration */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <div className="relative h-full bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 badge-amber text-xs font-medium rounded-full">
                  <Wrench className="w-3 h-3" />
                  {t("badge")}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-white/70" />
                </div>
                <h3 className="text-lg font-semibold text-white">{t("daw.title")}</h3>
              </div>

              <p className="text-white/70 text-sm leading-relaxed">
                {t("daw.quote")}
              </p>
            </div>
          </motion.div>

          {/* Conversation with Hoo */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <div className="relative h-full bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 badge-amber text-xs font-medium rounded-full">
                  <Wrench className="w-3 h-3" />
                  {t("badge")}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white/70" />
                </div>
                <h3 className="text-lg font-semibold text-white">{t("conversation.title")}</h3>
              </div>

              <p className="text-white/70 text-sm leading-relaxed">
                {t("conversation.quote")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
