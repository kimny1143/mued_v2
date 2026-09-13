import { BrandHeader } from "@/components/brand/brand-header";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { StoryArticle } from "@/components/features/story/story-article";
import { STORY_SLUGS, getArticleSections, type StorySlug } from "@/lib/story/articles";
import type { Locale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return STORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "story" });

  if (!STORY_SLUGS.includes(slug as StorySlug)) {
    return {};
  }

  const baseUrl = "https://mued.jp";

  return {
    title: t(`articles.${slug}.title`),
    description: t(`articles.${slug}.description`),
    alternates: {
      canonical: `${baseUrl}/${locale}/story/${slug}`,
    },
    openGraph: {
      title: t(`articles.${slug}.title`),
      description: t(`articles.${slug}.description`),
      url: `${baseUrl}/${locale}/story/${slug}`,
      type: "article",
      siteName: "MUED",
    },
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!STORY_SLUGS.includes(slug as StorySlug)) {
    notFound();
  }

  const sections = getArticleSections(slug as StorySlug, locale);

  return (
    <div className="dark">
      <div className="fixed inset-0 -z-10 bg-bg-primary" />
      <BrandHeader locale={locale} />
      <main className="min-h-screen py-20 px-6">
      <StoryArticle slug={slug as StorySlug} sections={sections} />
      </main>
    </div>
  );
}
