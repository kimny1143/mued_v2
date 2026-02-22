"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const STORY_SLUGS = ["brain01", "brain02", "mued", "muedear", "hoo"] as const;

/**
 * Developer Story Section - Editorial Style
 *
 * LPに表示する開発ストーリーセクション。
 * 雑誌のインタビュー記事風のカード。
 */
export function DeveloperStorySection() {
  const t = useTranslations("story");
  const locale = useLocale();

  return (
    <section className="py-32 bg-[#0a0a0a] relative">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        {/* Section header - Editorial style */}
        <div className="max-w-4xl mx-auto mb-16">
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
            Interview
          </p>
          <h2 className="text-section font-bold text-white mb-3 tracking-tight">
            {t("section.title")}
          </h2>
          <p className="text-base text-white/50">
            {t("section.subtitle")}
          </p>
        </div>

        {/* Story cards - Stacked layout */}
        <div className="max-w-4xl mx-auto space-y-6">
          {STORY_SLUGS.map((slug, index) => (
            <motion.div
              key={slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
            >
              <StoryCard slug={slug} locale={locale} index={index} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface StoryCardProps {
  slug: "hoo" | "mued" | "muedear" | "brain01" | "brain02";
  locale: string;
  index: number;
}

function StoryCard({ slug, locale, index }: StoryCardProps) {
  const t = useTranslations("story");

  return (
    <Link
      href={`/${locale}/story/${slug}`}
      className="group block border-b border-white/10 pb-8 hover:border-white/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-8">
        {/* Number */}
        <span className="text-white/20 text-sm font-mono mt-1">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2 group-hover:text-white/80 transition-colors tracking-tight">
            {t(`cards.${slug}.title`)}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed max-w-2xl">
            {t(`cards.${slug}.description`)}
          </p>
        </div>

        {/* Arrow */}
        <div className="mt-2">
          <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-all group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
