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

  return (
    <div className="dark min-h-screen bg-bg-primary">
      <BrandHeader locale={locale} product="MUED" />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("sections.status.heading")}</h2>
            <p className="text-slate-400">{t("sections.status.body")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("sections.agreement.heading")}</h2>
            <p className="text-slate-400">{t("sections.agreement.body")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("sections.contact.heading")}</h2>
            <p className="text-slate-400">
              {t("sections.contact.body")}{" "}
              <a href="mailto:support@mued.jp" className="text-blue-400 hover:underline">
                support@mued.jp
              </a>
            </p>
          </section>

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
