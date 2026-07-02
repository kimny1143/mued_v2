"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const TIERS = ["consult", "diagnosis", "build", "companion"] as const;

export function AdvisoryPricingSection() {
  const t = useTranslations("advisory.pricing");

  return (
    <section className="py-24 bg-[#0a0a0a] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4 text-center tracking-tight">
          {t("title")}
        </h2>
        <p className="text-white/60 mb-16 text-center max-w-2xl mx-auto">
          {t("subtitle")}
        </p>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {TIERS.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
            >
              <div
                className={`bg-[#111] border rounded-xl p-6 h-full transition-colors ${
                  key === "consult"
                    ? "border-amber-400/30 hover:border-amber-400/50"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {key === "consult" && <Star className="w-4 h-4 text-amber-400" />}
                  <h3 className="text-lg font-bold text-white">{t(`${key}.name`)}</h3>
                </div>
                <p className="text-amber-400 font-semibold mb-3">{t(`${key}.price`)}</p>
                <p className="text-white/60 text-sm leading-relaxed">{t(`${key}.what`)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
