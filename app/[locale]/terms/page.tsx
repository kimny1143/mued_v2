// 利用規約 / Terms of Service。★FastSpring の activation 要件（サイト側に Terms / Privacy /
// Refund が在り、表示価格が一致していること）を満たすための面。
//
// ★MoR の扱いをここで宣言する: ★有料プラグインの ★販売事業者（Merchant of Record）は
// ★FastSpring, Inc. で、★glasswerks inc. は ★提供者（開発・サポート）である。★この2行は
// /tokushoho・/refund と ★同じ表記で揃える（★ずれると特商法の表示として問題になる）。
//
// ★構造は app/[locale]/privacy/page.tsx を踏襲（BrandHeader / self canonical / hreflang）。
// ★本文は messages/{en,ja}.json の `terms` namespace に置く（★公開面のコピーは i18n 側が正本）。
import { BrandHeader } from "@/components/brand/brand-header";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return {
    title: locale === "ja" ? "利用規約 | MUED" : "Terms of Service | MUED",
    description: locale === "ja" ? "MUED の利用規約" : "MUED Terms of Service",
    alternates: {
      // privacy と同じ理由で self-referencing canonical を置く（無いと /ja と /en が
      // 「ほぼ同一で優先指定なし」になり Search Console が duplicate を報告する）。
      canonical: `https://mued.jp/${locale}/terms`,
      languages: generateHreflangAlternates("/terms"),
    },
  };
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <TermsContent locale={locale} />;
}

function TermsContent({ locale }: { locale: string }) {
  const t = useTranslations("terms");
  const isJa = locale === "ja";

  const sections = ["scope", "accounts", "purchase", "license", "refund", "prohibited", "disclaimer", "changes"] as const;

  return (
    <div className="dark min-h-screen bg-bg-primary">
      <BrandHeader locale={locale} product="MUED" />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>
          <p className="text-slate-300 mb-8">{t("intro")}</p>

          {/* ★販売事業者（MoR）と提供者の2行。★/tokushoho・/refund と同一表記。 */}
          <section className="mb-8 rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <p className="text-slate-300 mb-1">{t("mor.seller")}</p>
            <p className="text-slate-300">{t("mor.provider")}</p>
          </section>

          {sections.map((s) => (
            <section key={s} className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">{t(`${s}.title`)}</h2>
              <p className="text-slate-400 whitespace-pre-line">{t(`${s}.body`)}</p>
            </section>
          ))}

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("contact.title")}</h2>
            <p className="text-slate-400">
              {t("contact.body")}{" "}
              <a href="mailto:support@mued.jp" className="text-blue-400 hover:underline">
                support@mued.jp
              </a>
            </p>
          </section>

          <div className="mt-12 flex gap-6 text-sm">
            <Link href={`/${locale}/privacy`} className="text-slate-400 hover:text-white">
              {isJa ? "プライバシーポリシー" : "Privacy Policy"}
            </Link>
            <Link href={`/${locale}/refund`} className="text-slate-400 hover:text-white">
              {isJa ? "返金ポリシー" : "Refund Policy"}
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
