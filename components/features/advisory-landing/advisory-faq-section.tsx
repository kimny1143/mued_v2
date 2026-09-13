// FAQ (kept per conductor — LLMO value). Accordion, light theme, between APPROACH and CONTACT.
// Content = current advisory.faq.* (kimny Rider B redline is decoupled — copy tweak, no re-port).
// FAQPage JSON-LD lives in page.tsx.
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// q5 (費用感) removed — it duplicated the Pricing section (content課 dedup, kimny live review).
const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;
type FaqKey = (typeof FAQ_KEYS)[number];

export function AdvisoryFaqSection() {
  const t = useTranslations("advisory.faq");
  const [openItems, setOpenItems] = useState<Set<FaqKey>>(new Set());

  const toggleItem = (key: FaqKey) =>
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section className="border-t border-neutral-100 px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#865109]">FAQ</p>
        <h2 className="mb-8 text-2xl font-medium tracking-tight text-neutral-900">{t("title")}</h2>
        <div className="border-t border-neutral-200">
          {FAQ_KEYS.map((key) => (
            <FaqItem key={key} faqKey={key} isOpen={openItems.has(key)} onToggle={() => toggleItem(key)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ faqKey, isOpen, onToggle }: { faqKey: FaqKey; isOpen: boolean; onToggle: () => void }) {
  const t = useTranslations(`advisory.faq.${faqKey}`);

  return (
    <div className="border-b border-neutral-200">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-[#865109]"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-medium text-neutral-900">{t("question")}</span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <p className="pb-5 text-sm leading-[1.9] text-neutral-600">{t("answer")}</p>
        </div>
      </div>
    </div>
  );
}
