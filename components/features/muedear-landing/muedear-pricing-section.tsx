"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, TrendingUp } from "lucide-react";

/**
 * MUEDear Pricing Section
 *
 * Free tier details and ear profile vision.
 */
export function MuedearPricingSection() {
  const t = useTranslations("muedear.pricing");

  return (
    <section className="py-28 bg-[#0a0a0a] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 text-center tracking-tight">
          {t("title")}
        </h2>
        <p className="text-lg text-white/80 mb-16 text-center max-w-2xl mx-auto">
          {t("intro")}
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free tier details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <div className="h-full bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
              <h3 className="text-xl font-bold text-white mb-6">
                {t("free.title")}
              </h3>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-white/70">{t("free.games")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-white/70">{t("free.modes")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-white/70">{t("free.ads")}</span>
                </li>
              </ul>

              {/* Quote */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <h4 className="text-sm font-semibold text-white/50 mb-3">
                  {t("why.title")}
                </h4>
                <blockquote className="text-white/70 text-sm italic leading-relaxed">
                  {t("why.quote")}
                </blockquote>
              </div>
            </div>
          </motion.div>

          {/* Ear Profile vision */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <div className="h-full bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {t("earProfile.title")}
                </h3>
              </div>

              <p className="text-white/70 leading-relaxed flex-1">
                {t("earProfile.description")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
