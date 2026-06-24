"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

const HOO_PASS_FEATURES = [
  "credits",
  "preview",
  "wav",
  "hoo",
  "rollover",
] as const;

export function AiMixingPricingSection() {
  const t = useTranslations("aiMixing.pricing");

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 text-center tracking-tight">
          {t("title")}
        </h2>
        <p className="text-lg text-white/60 mb-16 text-center max-w-2xl mx-auto">
          {t("subtitle")}
        </p>

        <div className="max-w-5xl mx-auto space-y-12">
          {/* Monthly Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">
              {t("monthly.label")}
            </h3>
            <div className="bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h4 className="text-xl font-bold text-white">
                    {t("monthly.hooPass.name")}
                  </h4>
                  <p className="text-white/60 text-sm mt-1">
                    {t("monthly.hooPass.price")}
                    <span className="text-white/40 ml-2">
                      （{t("monthly.hooPass.priceJpy")}）
                    </span>
                  </p>
                </div>
              </div>
              <ul className="grid md:grid-cols-2 gap-3">
                {HOO_PASS_FEATURES.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-white/70 text-sm">
                      {t(`monthly.hooPass.features.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Single Purchase */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">
              {t("single.label")}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {(["dialogue", "omakase", "mastering"] as const).map((key) => (
                <div
                  key={key}
                  className={`bg-[#111] border rounded-xl p-6 transition-colors ${
                    key === "dialogue"
                      ? "border-amber-400/30 hover:border-amber-400/50"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {key === "dialogue" && (
                      <Star className="w-4 h-4 text-amber-400" />
                    )}
                    <h4 className="text-lg font-bold text-white">
                      {t(`single.${key}.name`)}
                    </h4>
                  </div>
                  <p className="text-white/80 font-semibold">
                    {t(`single.${key}.price`)}
                    <span className="text-white/40 text-sm ml-2">
                      （{t(`single.${key}.priceJpy`)}）
                    </span>
                  </p>
                  <p className="text-white/60 text-sm mt-2">
                    {t(`single.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Credit Packs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">
              {t("packs.label")}
            </h3>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
              {(["small", "large"] as const).map((key) => (
                <div
                  key={key}
                  className="bg-[#111] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
                >
                  <h4 className="text-sm font-bold text-white mb-1">
                    {t(`packs.${key}.name`)}
                  </h4>
                  <p className="text-white/80 font-semibold">
                    {t(`packs.${key}.price`)}
                    <span className="text-white/40 text-sm ml-2">
                      （{t(`packs.${key}.priceJpy`)}）
                    </span>
                  </p>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-sm mt-3">
              {t("packs.expiry")}
            </p>
          </motion.div>

          {/* Beta Note */}
          <p className="text-white/40 text-sm text-center">
            {t("betaNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
