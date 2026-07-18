import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getLearnArticle, LEARN_SLUGS } from "@/lib/learn/articles";
import { LEARN_LIVE } from "@/lib/learn/config";
import { LearnArticleView } from "@/components/features/learn/learn-article";

//
// /learn/<slug> — EN evergreen reference article (Road to 10k 層2 #8). NON-locale route (like app/dial,
// app/muedear) → the JA face / next-intl tree is untouched. Fully static: dynamicParams=false + all
// slugs pre-rendered, so the gray-matter fs reads run at build.
//
export const dynamicParams = false;

const BASE = "https://mued.jp";

export function generateStaticParams() {
  return LEARN_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getLearnArticle(slug);
  if (!article) return {};
  const url = `${BASE}/learn/${article.slug}`;
  return {
    title: article.seoTitle,
    description: article.description,
    keywords: article.tags,
    alternates: { canonical: url },
    // Staged: noindex until the track goes live (kimny flips LEARN_LIVE after the tone gate).
    robots: { index: LEARN_LIVE, follow: LEARN_LIVE },
    openGraph: {
      title: article.seoTitle,
      description: article.description,
      url,
      type: "article",
      locale: "en_US",
      siteName: "MUED",
    },
  };
}

export default async function LearnArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getLearnArticle(slug);
  if (!article) notFound();

  const url = `${BASE}/learn/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    description: article.description,
    ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
    ...(article.publishDate ? { datePublished: article.publishDate } : {}),
    ...(article.lastUpdated || article.publishDate
      ? { dateModified: article.lastUpdated ?? article.publishDate }
      : {}),
    author: { "@type": "Organization", name: "MUED", url: BASE },
    publisher: { "@type": "Organization", name: "glasswerks inc.", url: BASE },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "en",
  };

  return (
    <div className="dark min-h-screen bg-bg-primary">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-bg-primary/80 px-6 py-4 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-white transition-colors hover:text-slate-300">
            MUED
          </Link>
          <Link href="/learn" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            Learn
          </Link>
        </div>
      </header>

      <main className="px-6 pt-24 pb-16">
        <LearnArticleView article={article} />
      </main>

      <footer className="border-t border-white/10 bg-bg-primary py-8">
        <div className="container mx-auto px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} glasswerks inc. · mued.jp</p>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/learn" className="text-slate-500 transition-colors hover:text-slate-300">
                All articles
              </Link>
              <Link href="/muedsp" className="text-slate-500 transition-colors hover:text-slate-300">
                Free plugins
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
