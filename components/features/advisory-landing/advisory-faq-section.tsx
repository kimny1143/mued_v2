// FAQ = Rider B (v7.1 draft, kimny redline before unlock). Mirrors ai-mixing-faq-section.
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

type FaqKey = (typeof FAQ_KEYS)[number];

export function AdvisoryFaqSection() {
  const t = useTranslations("advisory.faq");
  const [openItems, setOpenItems] = useState<Set<FaqKey>>(new Set());

  const toggleItem = (key: FaqKey) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section className="py-24 bg-[#0a0a0a] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-16 text-center">
          {t("title")}
        </h2>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_KEYS.map((key) => (
            <FaqItem
              key={key}
              faqKey={key}
              isOpen={openItems.has(key)}
              onToggle={() => toggleItem(key)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FaqItemProps {
  faqKey: FaqKey;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqItem({ faqKey, isOpen, onToggle }: FaqItemProps) {
  const t = useTranslations(`advisory.faq.${faqKey}`);

  return (
    <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-white pr-4">{t("question")}</span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-white/60 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-4 text-white/80 text-sm leading-relaxed">
            {t("answer")}
          </p>
        </div>
      </div>
    </div>
  );
}
