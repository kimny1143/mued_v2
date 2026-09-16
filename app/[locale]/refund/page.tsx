// 返金ポリシー / Refund Policy。★FastSpring の activation 要件の1つ。
//
// ★この面の要点は「★誰が返金を判断するか」である: ★有料プラグインは ★FastSpring, Inc. が
// ★Merchant of Record ∴ ★**決済と返金は FastSpring の条件に従う**。★glasswerks inc. は
// ★提供者（開発・サポート）で、★返金の可否を単独で決める立場にない。
// ★ここを曖昧に書くと、★購入者が当社へ返金請求し、★当社が応じられず宙に浮く。
//
// ★表記は /terms・/tokushoho と ★同一の2行で揃える（★ずれると特商法の表示として問題になる）。
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
    title: locale === "ja" ? "返金ポリシー | MUED" : "Refund Policy | MUED",
    description: locale === "ja" ? "MUED の返金ポリシー" : "MUED Refund Policy",
    alternates: {
      canonical: `https://mued.jp/${locale}/refund`,
      languages: generateHreflangAlternates("/refund"),
    },
  };
}

export default async function RefundPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <RefundContent locale={locale} />;
}

function RefundContent({ locale }: { locale: string }) {
  const t = useTranslations("refund");
  const isJa = locale === "ja";

  const sections = ["who", "digital", "howTo", "plugins", "subscriptions"] as const;

  return (
    <div className="dark min-h-screen bg-bg-primary">
      <BrandHeader locale={locale} product="MUED" />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>
          <p className="text-slate-300 mb-8">{t("intro")}</p>

          {/* ★販売事業者（MoR）と提供者の2行。★/terms・/tokushoho と同一表記。 */}
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
            <Link href={`/${locale}/terms`} className="text-slate-400 hover:text-white">
              {isJa ? "利用規約" : "Terms of Service"}
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
