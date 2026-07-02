"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AdvisoryPrimaryCta } from "./advisory-primary-cta";

export function AdvisoryHeroSection() {
  const t = useTranslations("advisory.hero");

  return (
    <section className="pt-32 pb-20 relative">
      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-8 leading-tight max-w-3xl mx-auto">
            {t("title")}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="max-w-2xl mx-auto mb-12 space-y-4 text-left"
        >
          <p className="text-lg text-white/80 leading-relaxed">{t("lead1")}</p>
          <p className="text-lg text-white/80 leading-relaxed">{t("lead2")}</p>
          <p className="text-lg text-white/70 leading-relaxed">{t("lead3")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <AdvisoryPrimaryCta label={t("cta")} />
        </motion.div>
      </div>
    </section>
  );
}
