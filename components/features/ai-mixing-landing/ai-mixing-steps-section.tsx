"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Upload, MessageCircle, Music } from "lucide-react";

const STEP_ICONS = [Upload, MessageCircle, Music] as const;
const STEP_KEYS = ["step1", "step2", "step3"] as const;

export function AiMixingStepsSection() {
  const t = useTranslations("aiMixing.steps");

  return (
    <section className="py-24 bg-[#0a0a0a] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-16 text-center tracking-tight">
          {t("title")}
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {STEP_KEYS.map((key, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              >
                <div className="bg-[#111] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-sm font-bold text-amber-400">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {t(`${key}.description`)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
