// End User License Agreement / 使用許諾契約。
//
// The lawyer-approved body belongs in messages/{en,ja}.json. Until then this route follows the
// /learn staging mechanism exactly: it remains directly previewable, but metadata is noindex and
// the sitemap omits it. Publication requires EULA_LIVE=1 after the copy and EULA_VERSION are set.
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { BrandHeader } from "@/components/brand/brand-header";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { locales, type Locale } from "@/lib/i18n/config";
import { EULA_LIVE } from "@/lib/legal/config";
import { EULA_VERSION } from "@/lib/legal/eula";
import { parseEulaContent } from "@/lib/legal/eula-content";
import { EulaArticles, EulaBlocks } from "@/components/legal/eula-body";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ja" ? "使用許諾契約 | MUED" : "End User License Agreement | MUED",
    description: locale === "ja" ? "MUED エンドユーザー使用許諾契約" : "MUED End User License Agreement",
    robots: { index: EULA_LIVE, follow: EULA_LIVE },
    alternates: {
      canonical: `https://mued.jp/${locale}/eula`,
      languages: generateHreflangAlternates("/eula"),
    },
  };
}

export default async function EulaPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <EulaContent locale={locale} />;
}

function EulaContent({ locale }: { locale: string }) {
  const t = useTranslations("eula");
  const isJa = locale === "ja";
  // ★Throws on a malformed message — at build time, since this page is statically generated.
  const content = parseEulaContent({
    intro: t.raw("intro"),
    articles: t.raw("articles"),
    // ★Read only when present: t.raw on a missing key would return a fallback string, not undefined.
    effectiveDate: t.has("effectiveDate") ? t.raw("effectiveDate") : undefined,
  });
  // ★The text is required now (provisional EULA 2026.09 since 2026-09-30). Empty articles would mean
  //   the contract silently vanished from the page, so fail the (static) build instead of rendering
  //   a placeholder — there is no placeholder copy any more.
  if (content.articles.length === 0) {
    throw new Error("[eula] messages eula.articles is empty — the EULA page must not render without its text");
  }
  // ★The version shown is the SAME constant recorded at checkout, so page and consent cannot disagree.
  //   Unset values are left out rather than printed as a placeholder.
  const meta = [
    EULA_VERSION !== "PENDING-LAWYER-TEXT" ? `${isJa ? "版" : "Version"}: ${EULA_VERSION}` : null,
    content.effectiveDate ? `${isJa ? "施行日" : "Effective date"}: ${content.effectiveDate}` : null,
  ].filter((part): part is string => part !== null);

  return (
    <div className="dark min-h-screen bg-bg-primary">
      <BrandHeader locale={locale} product="MUED" />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          {meta.length > 0 && <p className="text-sm text-slate-500 mb-8">{meta.join(" · ")}</p>}
          <EulaBlocks blocks={content.intro} />
          <EulaArticles articles={content.articles} />

          <div className="mt-12 flex flex-wrap gap-6 text-sm">
            <Link href={`/${locale}/terms`} className="text-slate-400 hover:text-white">
              {isJa ? "利用規約" : "Terms of Service"}
            </Link>
            <Link href={`/${locale}/refund`} className="text-slate-400 hover:text-white">
              {isJa ? "返金ポリシー" : "Refund Policy"}
            </Link>
            <Link href={`/${locale}/privacy`} className="text-slate-400 hover:text-white">
              {isJa ? "プライバシーポリシー" : "Privacy Policy"}
            </Link>
            <Link href={`/${locale}/tokushoho`} className="text-slate-400 hover:text-white">
              {isJa ? "特定商取引法に基づく表記" : "Legal Notice (Japan)"}
            </Link>
            <Link href={`/${locale}/support`} className="text-slate-400 hover:text-white">
              {isJa ? "サポート" : "Support"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
