"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function AdvisoryWhoSection() {
  const t = useTranslations("advisory.who");

  return (
    <section className="py-24 bg-[#0a0a0a] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-8 tracking-tight">
            {t("title")}
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-4"
          >
            <p className="text-white/80 leading-relaxed">{t("body1")}</p>
            <p className="text-white/80 leading-relaxed">{t("body2")}</p>
            <ul className="pt-2 space-y-2 text-sm">
              <li className="text-white/60">
                {t("recordLabel")}：
                <a
                  href={t("recordHref")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {t("recordText")}
                </a>
              </li>
              <li className="text-white/60">
                {t("profileLabel")}：
                <a
                  href={t("profileHref")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {t("profileText")}
                </a>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
