"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function AdvisoryMyWaySection() {
  const t = useTranslations("advisory.myWay");

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6 tracking-tight">
            {t("title")}
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-white/70 leading-relaxed"
          >
            {t("body")}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
