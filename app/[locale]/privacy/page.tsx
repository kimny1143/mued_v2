import { BrandHeader } from "@/components/brand/brand-header";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/features/cookie-consent/cookie-consent";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
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
    title: locale === "ja" ? "プライバシーポリシー | MUED" : "Privacy Policy | MUED",
    description: locale === "ja"
      ? "MUEDのプライバシーポリシー"
      : "MUED Privacy Policy",
    alternates: {
      // Self-referencing canonical. Without it, /ja/privacy and /en/privacy sit in the sitemap
      // as near-identical pages with no declared preference, and Search Console reports
      // "Duplicate, Google chose different canonical than user" — literally: the user
      // (this site) never chose one.
      canonical: `https://mued.jp/${locale}/privacy`,
      languages: generateHreflangAlternates("/privacy"),
    },
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <PrivacyContent locale={locale} />;
}

function PrivacyContent({ locale }: { locale: string }) {
  const t = useTranslations("privacy");
  const tc = useTranslations("cookieConsent");

  return (
    <div className="dark min-h-screen bg-bg-primary">
      {/* Header */}
      <BrandHeader locale={locale} product="MUED" />

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
              <li>{t("section1.items.downloads")}</li>
              <li>{t("section1.items.purchase")}</li>
              <li>{t("section1.items.otherSignups")}</li>
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
              <li>{t("section2.items.deliver")}</li>
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
                <strong>{t("section3.neon")}</strong>:{" "}
                <a href="https://neon.tech/privacy-policy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://neon.tech/privacy-policy
                </a>
              </li>
              <li>
                <strong>{t("section3.resend")}</strong>:{" "}
                <a href="https://resend.com/legal/privacy-policy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://resend.com/legal/privacy-policy
                </a>
              </li>
              <li>
                <strong>{t("section3.stripe")}</strong>:{" "}
                <a href="https://stripe.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://stripe.com/privacy
                </a>
              </li>
              <li>
                <strong>{t("section3.fastspring")}</strong>:{" "}
                <a href="https://fastspring.com/privacy/" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://fastspring.com/privacy/
                </a>
              </li>
              <li>
                <strong>{t("section3.vercel")}</strong>:{" "}
                <a href="https://vercel.com/legal/privacy-policy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://vercel.com/legal/privacy-policy
                </a>
              </li>
              <li>
                <strong>{t("section3.cloudflare")}</strong>:{" "}
                <a href="https://www.cloudflare.com/privacypolicy/" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://www.cloudflare.com/privacypolicy/
                </a>
              </li>
              <li>
                <strong>{t("section3.roex")}</strong>:{" "}
                <a href="https://roexaudio.com/privacy-policy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://roexaudio.com/privacy-policy
                </a>
              </li>
              <li>
                <strong>{t("section3.openai")}</strong>:{" "}
                <a href="https://openai.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://openai.com/privacy
                </a>
              </li>
              <li>
                <strong>{t("section3.anthropic")}</strong>:{" "}
                <a href="https://www.anthropic.com/legal/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://www.anthropic.com/legal/privacy
                </a>
              </li>
              <li>
                <strong>{t("section3.googleAnalytics")}</strong>:{" "}
                <a href="https://policies.google.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://policies.google.com/privacy
                </a>
              </li>
              <li>
                <strong>{t("section3.youtube")}</strong>:{" "}
                <a href="https://policies.google.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://policies.google.com/privacy
                </a>
              </li>
              <li>
                <strong>{t("section3.upstash")}</strong>:{" "}
                <a href="https://upstash.com/trust/privacy.pdf" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://upstash.com/trust/privacy.pdf
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
          <section id="cookies" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold text-white mb-4">{t("section6.title")}</h2>
            <p className="text-slate-300">{t("section6.description")}</p>
            <CookieSettingsButton label={tc("settingsButton")} />
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
                <a href="mailto:support@mued.jp" className="text-blue-400 hover:underline">
                  support@mued.jp
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
              <Link href={`/${locale}/terms`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Terms
              </Link>
              <Link href={`/${locale}/refund`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Refund
              </Link>
              <Link href={`/${locale}/tokushoho`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Legal
              </Link>
              <Link href={`/${locale}/support`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Support
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
