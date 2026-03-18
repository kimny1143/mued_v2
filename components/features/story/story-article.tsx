"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { SectionBlock } from "@/types/story";
import { DialogueBlock } from "./dialogue-block";
import { STORY_SLUGS, type StorySlug } from "@/lib/story/articles";

const RELATED_ARTICLES: Partial<Record<StorySlug, StorySlug[]>> = {
  brain01: ["brain02"],
  brain02: ["brain01"],
  mued: ["muedear", "why"],
  muedear: ["mued", "ear"],
  hoo: ["brain02"],
  muedial: ["muedear", "brain01", "ear"],
  why: ["mued", "muedear", "hoo"],
  ear: ["muedear", "brain01", "muedial"],
};

interface StoryArticleProps {
  slug: StorySlug;
  sections: SectionBlock[];
}

/**
 * Story Article Component - Editorial Style
 *
 * 雑誌インタビュー形式の記事レイアウト。
 */
export function StoryArticle({ slug, sections }: StoryArticleProps) {
  const t = useTranslations("story");
  const locale = useLocale();

  // Get prev/next article slugs
  const currentIndex = STORY_SLUGS.indexOf(slug);
  const prevSlug = currentIndex > 0 ? STORY_SLUGS[currentIndex - 1] : null;
  const nextSlug = currentIndex < STORY_SLUGS.length - 1 ? STORY_SLUGS[currentIndex + 1] : null;

  return (
    <article className="max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-16">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t("nav.backToTop")}</span>
        </Link>

        {/* Title - Editorial style */}
        <h1 className="text-headline font-bold text-white mb-6 leading-tight tracking-tight">
          {t(`articles.${slug}.title`)}
        </h1>

        {/* Author & Date */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/40">
          <span>{t(`articles.${slug}.author`)}</span>
          <span className="text-white/20">—</span>
          <span>{t(`articles.${slug}.date`)}</span>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-0">
        {sections.map((block, index) => (
          <SectionBlockRenderer key={index} block={block} />
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-20 pt-10 border-t border-white/10">
        <p className="text-sm text-white/40 italic mb-12">
          {t(`articles.${slug}.footer`)}
        </p>

        {/* Related Articles */}
        {RELATED_ARTICLES[slug] && RELATED_ARTICLES[slug].length > 0 && (
          <div className="mb-12">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
              {t("nav.related")}
            </p>
            <div className="space-y-3">
              {RELATED_ARTICLES[slug]!.map((relatedSlug) => (
                <Link
                  key={relatedSlug}
                  href={`/${locale}/story/${relatedSlug}`}
                  className="group block border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
                >
                  <p className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                    {t(`cards.${relatedSlug}.title`)}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {t(`cards.${relatedSlug}.description`)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {prevSlug ? (
            <Link
              href={`/${locale}/story/${prevSlug}`}
              className="group flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm">{t(`cards.${prevSlug}.title`)}</span>
            </Link>
          ) : (
            <div />
          )}

          {nextSlug ? (
            <Link
              href={`/${locale}/story/${nextSlug}`}
              className="group flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
            >
              <span className="text-sm">{t(`cards.${nextSlug}.title`)}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <Link
              href={`/${locale}`}
              className="group flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
            >
              <span className="text-sm">{t("nav.backToTop")}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}

interface SectionBlockRendererProps {
  block: SectionBlock;
}

function SectionBlockRenderer({ block }: SectionBlockRendererProps) {
  switch (block.type) {
    case "dialogue":
      return <DialogueBlock block={block} />;

    case "heading":
      return (
        <h2 className="text-lg font-semibold text-white mt-14 mb-6 tracking-tight">
          {block.text}
        </h2>
      );

    case "meta":
      return (
        <p className="text-center text-white/30 text-sm italic py-8 my-4">
          {block.text}
        </p>
      );

    case "divider":
      return (
        <div className="my-12 flex justify-center">
          <div className="w-12 h-px bg-white/10" />
        </div>
      );

    case "pullquote":
      return (
        <blockquote className="my-10 py-6 border-l-2 border-white/20 pl-5">
          <p className="text-lg font-light text-white/80 leading-relaxed italic">
            &ldquo;{block.text}&rdquo;
          </p>
          {block.speaker && (
            <cite className="block mt-3 text-xs text-white/40 not-italic">
              — {block.speaker}
            </cite>
          )}
        </blockquote>
      );

    case "table":
      return (
        <div className="my-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {block.headers.map((header, i) => (
                  <th key={i} className="text-left py-3 px-4 text-white/50 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  {row.map((cell, j) => (
                    <td key={j} className="py-3 px-4 text-white/80">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}
