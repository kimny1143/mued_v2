"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function AiMixingUtamitaSection() {
  const t = useTranslations("aiMixing.utamita");

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-10 tracking-tight">
              {t("title")}
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="space-y-3 mb-8"
          >
            {(["pain1", "pain2", "pain3"] as const).map((key) => (
              <p key={key} className="text-white/60 text-lg">
                {t(key)}
              </p>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            <p className="text-white font-semibold text-lg">
              {t("solution")}
            </p>

            <div className="bg-[#111] border border-white/5 rounded-xl p-6">
              <p className="text-white/80 leading-relaxed">
                {t("detail1")}
                <br />
                {t("detail2")}
              </p>
              <p className="text-white/80 leading-relaxed mt-4">
                {t("detail3")}
                <br />
                {t("example")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
