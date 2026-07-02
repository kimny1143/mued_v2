import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n/config";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ADVISORY_LIVE } from "@/lib/advisory/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return {
    title: locale === "ja" ? "プライバシーポリシー | MUEDnote" : "Privacy Policy | MUEDnote",
    description: locale === "ja"
      ? "MUEDnoteのプライバシーポリシー"
      : "MUEDnote Privacy Policy",
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <PrivacyContent />;
}

function PrivacyContent() {
  const t = useTranslations("privacy");

  return (
    <div className="dark min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-white font-semibold hover:text-slate-300 transition-colors">
            MUEDnote
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>

          <p className="text-slate-300 mb-8">{t("intro")}</p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section1.title")}</h2>
            <p className="text-slate-400 mb-3">{t("section1.description")}</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>{t("section1.items.account")}</li>
              <li>{t("section1.items.workLog")}</li>
              <li>{t("section1.items.voiceMemo")}</li>
              <li>{t("section1.items.usage")}</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section2.title")}</h2>
            <p className="text-slate-400 mb-3">{t("section2.description")}</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>{t("section2.items.provide")}</li>
              <li>{t("section2.items.transcribe")}</li>
              <li>{t("section2.items.support")}</li>
              <li>{t("section2.items.improve")}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section3.title")}</h2>
            <p className="text-slate-400 mb-3">{t("section3.description")}</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <strong>{t("section3.clerk")}</strong>:{" "}
                <a href="https://clerk.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://clerk.com/privacy
                </a>
              </li>
              <li>
                <strong>{t("section3.openai")}</strong>:{" "}
                <a href="https://openai.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://openai.com/privacy
                </a>
              </li>
              <li>
                <strong>{t("section3.vercel")}</strong>:{" "}
                <a href="https://vercel.com/legal/privacy-policy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://vercel.com/legal/privacy-policy
                </a>
              </li>
              <li>
                <strong>{t("section3.neon")}</strong>:{" "}
                <a href="https://neon.tech/privacy-policy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://neon.tech/privacy-policy
                </a>
              </li>
              <li>
                <strong>{t("section3.googleAnalytics")}</strong>:{" "}
                <a href="https://policies.google.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://policies.google.com/privacy
                </a>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section4.title")}</h2>
            <p className="text-slate-300 mb-3">{t("section4.description1")}</p>
            <p className="text-slate-300">{t("section4.description2")}</p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section5.title")}</h2>
            <p className="text-slate-400 mb-3">{t("section5.description")}</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>{t("section5.items.access")}</li>
              <li>{t("section5.items.correction")}</li>
              <li>{t("section5.items.deletion")}</li>
              <li>{t("section5.items.export")}</li>
            </ul>
            <p className="text-slate-400 mt-3">{t("section5.contact")}</p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section6.title")}</h2>
            <p className="text-slate-300">{t("section6.description")}</p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section7.title")}</h2>
            <p className="text-slate-300">{t("section7.description")}</p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section8.title")}</h2>
            <p className="text-slate-400 mb-4">{t("section8.description")}</p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="font-semibold text-white">{t("section8.company")}</p>
              <p className="text-slate-400">{t("section8.address")}</p>
              <p className="text-slate-400">
                Email:{" "}
                <a href="mailto:info@glasswerks.jp" className="text-blue-400 hover:underline">
                  info@glasswerks.jp
                </a>
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section9.title")}</h2>
            <p className="text-slate-400 mb-3">{t("section9.description")}</p>
            <p className="text-slate-400 mb-3">{t("section9.retention")}</p>
            <p className="text-slate-400 mb-3">{t("section9.purpose")}</p>
            <p className="text-slate-400">{t("section9.optout")}</p>
          </section>

          {/* Section 10 — MUED advisory (staged: hidden until ADVISORY_LIVE) */}
          {ADVISORY_LIVE && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">{t("section10.title")}</h2>
              <p className="text-slate-400 mb-3">{t("section10.description")}</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>{t("section10.items.collect")}</li>
                <li>{t("section10.items.recording")}</li>
                <li>{t("section10.items.purpose")}</li>
                <li>{t("section10.items.retention")}</li>
                <li>{t("section10.items.thirdParty")}</li>
                <li>{t("section10.items.withdraw")}</li>
              </ul>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-bg-primary py-8 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} MUED. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link href="/tokushoho" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Legal
              </Link>
              <Link href="/support" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Support
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
