"use client";

import { Clock, Music, Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

/**
 * Philosophy Section - Landing Page
 *
 * MVP features: Rest tracker + Sound reaction + Voice memo
 * No AI conversation - just a cute companion
 */
export function PhilosophySection() {
  const t = useTranslations("landing.philosophy");

  return (
    <section className="py-28 bg-[#0a0a0a] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        {/* Intro - softer tone */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl mb-20"
        >
          <h2 className="text-section text-white mb-8 leading-tight font-extrabold tracking-tight">
            {t("title")}
          </h2>

          <div className="text-lg md:text-xl text-white/80 leading-relaxed space-y-6">
            <p className="whitespace-pre-line">{t("intro")}</p>
          </div>
        </motion.div>

        {/* Three features - MVP accurate */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Clock, key: "rest" },
            { icon: Music, key: "sound" },
            { icon: Mic, key: "voice" },
          ].map(({ icon: Icon, key }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
            >
              <div className="h-full bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white/70" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{t(`features.${key}.title`)}</h3>
                </div>
                <p className="text-white/70 leading-relaxed">{t(`features.${key}.description`)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
