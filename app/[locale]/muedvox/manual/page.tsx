import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { locales, type Locale } from "@/lib/i18n/config";
import { MUEDVOX_LIVE, MUEDVOX_VIDEO_ID, muedvoxPageVisible, muedvoxVideo } from "@/lib/muedvox/config";
import { readMuedvoxManual, splitManual, type ManualLocale } from "@/lib/muedvox/manual";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const { title } = splitManual(readMuedvoxManual(locale as ManualLocale));
  const t = await getTranslations({ locale, namespace: "muedvox.manual" });
  return {
    title: `${title} | MUED`,
    description: t("description"),
    robots: { index: MUEDVOX_LIVE, follow: MUEDVOX_LIVE },
    alternates: {
      canonical: `https://mued.jp/${locale}/muedvox/manual`,
      languages: generateHreflangAlternates("/muedvox/manual"),
    },
  };
}

// The product page's typography (MUEDvox LP / MUEDsp masterchain block), for long reading.
const md: Components = {
  h1: () => null, // the file's title is the page heading
  h2: ({ node: _n, ...p }) => <h2 className="mt-12 border-t border-white/5 pt-8 text-2xl font-bold tracking-tight text-white" {...p} />,
  h3: ({ node: _n, ...p }) => <h3 className="mt-6 text-lg font-medium leading-snug text-white/85" {...p} />,
  p: ({ node: _n, ...p }) => <p className="mt-3 text-[15px] leading-relaxed text-white/70" {...p} />,
  ul: ({ node: _n, ...p }) => <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-white/70" {...p} />,
  ol: ({ node: _n, ...p }) => <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-white/70" {...p} />,
  strong: ({ node: _n, ...p }) => <strong className="font-semibold text-white/90" {...p} />,
  a: ({ node: _n, ...p }) => <a className="text-[#f5a524] underline underline-offset-2" {...p} />,
  hr: () => <hr className="mt-12 border-white/10" />, // before the trademark line at the end
  code: ({ node: _n, ...p }) => <code className="break-all font-mono text-[13px] text-white/80" {...p} />,
  table: ({ node: _n, ...p }) => <div className="mt-4 overflow-x-auto"><table className="w-full border-y border-white/5 text-left text-[15px] leading-relaxed text-white/70" {...p} /></div>,
  th: ({ node: _n, ...p }) => <th scope="col" className="py-3 pr-5 font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]" {...p} />,
  td: ({ node: _n, ...p }) => <td className="border-t border-white/5 py-3 pr-5 align-top" {...p} />,
};

export default async function MuedvoxManualPage({ params }: PageProps) {
  const { locale } = await params;
  // ★Same gate as the product page: not released → 404 in production.
  if (!muedvoxPageVisible(MUEDVOX_LIVE, process.env.VERCEL_ENV, process.env.NODE_ENV)) notFound();
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "muedvox.manual" });
  const { title, body } = splitManual(readMuedvoxManual(locale as ManualLocale));
  return (
    <div className="brand-product dark min-h-screen bg-[var(--bg-base)] text-white">
      <header className="brand-header">
        <div className="brand-header-inner">
          <Link href={`/${locale}/muedvox`}><BrandMark product="MUEDvox" /></Link>
          <div className="brand-header-actions"><LocaleSwitcher /></div>
        </div>
      </header>
      <main className="border-t border-white/5 px-6 py-14">
        <article className="mx-auto max-w-3xl" data-testid="muedvox-manual">
          <Link href={`/${locale}/muedvox`} className="text-sm text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("back")}</Link>
          {/* The how-to video on YouTube (kimny 10/27). The ID lives only in lib/muedvox/config.ts. */}
          {MUEDVOX_VIDEO_ID && <a href={muedvoxVideo().watchUrl} target="_blank" rel="noopener noreferrer" data-testid="muedvox-manual-video-link" className="ml-6 text-sm text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("videoLink")} ↗</a>}
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">{title}</h1>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{body}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
