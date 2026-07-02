"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AdvisoryPrimaryCta } from "./advisory-primary-cta";

export function AdvisoryCtaSection() {
  const t = useTranslations("advisory.footerCta");

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4 tracking-tight">
            {t("title")}
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">{t("description")}</p>
          <AdvisoryPrimaryCta label={t("cta")} />
        </motion.div>
      </div>
    </section>
  );
}
