"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const ROW_KEYS = [
  "operation",
  "flexibility",
  "redo",
  "mixing",
  "japanese",
  "knowledge",
] as const;

export function AiMixingComparisonSection() {
  const t = useTranslations("aiMixing.comparison");

  return (
    <section className="py-24 bg-[#0a0a0a] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-16 text-center tracking-tight">
          {t("title")}
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-4 px-4 text-white/50 text-sm font-medium border-b border-white/10">
                    {t("headers.feature")}
                  </th>
                  <th className="text-left py-4 px-4 text-white/50 text-sm font-medium border-b border-white/10">
                    {t("headers.traditional")}
                  </th>
                  <th className="text-left py-4 px-4 text-amber-400 text-sm font-bold border-b border-amber-400/30">
                    {t("headers.muedial")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROW_KEYS.map((key) => (
                  <tr key={key} className="border-b border-white/5">
                    <td className="py-3 px-4 text-white font-medium text-sm">
                      {t(`rows.${key}.label`)}
                    </td>
                    <td className="py-3 px-4 text-white/50 text-sm">
                      {t(`rows.${key}.traditional`)}
                    </td>
                    <td className="py-3 px-4 text-white/90 text-sm font-medium">
                      {t(`rows.${key}.muedial`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="max-w-3xl mx-auto mt-12 space-y-3"
        >
          <p className="text-white/70 leading-relaxed">{t("supplement1")}</p>
          <p className="text-white/70 leading-relaxed">{t("supplement2")}</p>
          <p className="text-white/80 leading-relaxed font-medium">
            {t("supplement3")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
