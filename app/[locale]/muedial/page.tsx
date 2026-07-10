//
// /muedial — wave1 mock PLACEHOLDER (STAGED, noindex). The real MUEDial LP (pricing + trust
// section with the 3 宣言) is wave2. This is only a graceful landing target for the portal's MIX
// CTA during the kimny 現物 gate — and, since MUEDial is already live, it links straight to the app
// (dial.mued.jp) so no one is dead-ended. Superseded by the real /muedial in wave2.
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ja" ? "MUEDial — 準備中" : "MUEDial — coming soon",
    robots: { index: false, follow: false },
  };
}

export default async function MuedialPlaceholderPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const isJa = locale === "ja";
  const t = await getTranslations({ locale, namespace: "landing.v2.mix" });

  return (
    <div className="dark flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <main className="flex flex-1 items-center px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[#f5a524]/80">MIX</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">{t("heading")}</h1>
          <p className="mt-3 font-mono text-[13px] uppercase tracking-[0.18em] text-white/55">
            {t("role")}
          </p>
          <p className="mt-8 text-sm text-white/40">
            {isJa
              ? "MUEDial の製品ページは準備中です。いまは、こちらから使えます。"
              : "The MUEDial product page is on the way. You can already use it here."}
          </p>
          <a
            href="https://dial.mued.jp"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[#f5a524] px-5 py-3 font-semibold text-black transition-colors duration-200 hover:bg-[#ffb638]"
          >
            {isJa ? "MUEDial を開く（dial.mued.jp）" : "Open MUEDial (dial.mued.jp)"}
          </a>
          <div className="mt-6">
            <Link
              href={`/${locale}/redesign`}
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524]/80 transition-colors hover:text-[#ffc35a]"
            >
              {isJa ? "トップへ戻る" : "Back to top"}
              <span aria-hidden="true">←</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
