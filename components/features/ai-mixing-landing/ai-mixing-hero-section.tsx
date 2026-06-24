"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";

export function AiMixingHeroSection() {
  const t = useTranslations("aiMixing.hero");

  return (
    <section className="pt-32 pb-20 relative">
      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-2">
            {t("title")}
          </h1>
          <p className="text-xl md:text-2xl text-white/60 font-medium mb-10">
            {t("subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="max-w-2xl mx-auto mb-12"
        >
          <p className="text-lg text-white/80 leading-relaxed">
            {t("description1")}
            <br />
            {t("description2")}
            <br />
            {t("description3")}
          </p>
          <p className="text-lg text-white/60 mt-4">
            {t("description4")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <Link
            href="/dial/"
            className="inline-flex items-center px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-lg"
          >
            {t("cta")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
