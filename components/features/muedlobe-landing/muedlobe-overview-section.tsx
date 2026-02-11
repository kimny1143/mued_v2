"use client";

import { useTranslations } from "next-intl";
import { Gamepad2, BarChart3, Sparkles } from "lucide-react";

const STEPS = [
  { key: "step1" as const, icon: Gamepad2 },
  { key: "step2" as const, icon: BarChart3 },
  { key: "step3" as const, icon: Sparkles },
];

export function MuedlobeOverviewSection() {
  const t = useTranslations("muedlobe.overview");
  const tRoot = useTranslations("muedlobe");

  return (
    <section className="py-24 bg-[#0a0a0a]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 text-center">
            {t("title")}
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map(({ key, icon: Icon }, index) => (
              <div key={key} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <p className="text-xs text-violet-400 font-mono mb-2">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="text-white/80 text-sm font-medium">
                  {t(key)}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-16 text-center text-xs text-white/30">
            {tRoot("disclaimer")}
          </p>
        </div>
      </div>
    </section>
  );
}
