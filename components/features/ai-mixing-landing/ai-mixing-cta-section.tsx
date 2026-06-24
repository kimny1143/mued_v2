"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";

export function AiMixingCtaSection() {
  const t = useTranslations("aiMixing.footerCta");

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
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            {t("description")}
          </p>
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
