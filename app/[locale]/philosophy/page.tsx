//
// /philosophy — wave1 mock PLACEHOLDER (STAGED, noindex). The real philosophy page (the 3 宣言 +
// data-handling section) is wave2 and needs kimny's edit of the 宣言文, so this is only a graceful
// landing target for the portal's philosophy 導線 during the kimny 現物 gate — NOT the wave2 content.
// It reuses landing.v2.philosophy (content課 copy) as the intro and states plainly that the full
// page is coming. Superseded by the real /philosophy in wave2.
import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "MUED — philosophy (preview placeholder)",
  robots: { index: false, follow: false },
};

export default async function PhilosophyPlaceholderPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const isJa = locale === "ja";
  const t = await getTranslations({ locale, namespace: "landing.v2.philosophy" });

  return (
    <div className="dark flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <main className="flex flex-1 items-center px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#f5a524]/70">
            {t("eyebrow")}
          </p>
          <p className="mt-5 text-2xl font-light leading-[1.9] text-white/80 md:text-3xl md:leading-[1.7]">
            {t("statement")}
          </p>
          <p className="mt-10 text-sm text-white/40">
            {isJa
              ? "MUED の哲学ページ本編は準備中です。"
              : "The full MUED philosophy page is on the way."}
          </p>
          <Link
            href={`/${locale}/redesign`}
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]"
          >
            {isJa ? "トップへ戻る" : "Back to top"}
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
