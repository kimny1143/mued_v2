import { useTranslations } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n/config";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
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
    title: locale === "ja" ? "サポート | MUEDnote" : "Support | MUEDnote",
    description: locale === "ja"
      ? "MUEDnoteのサポートページ - よくある質問とお問い合わせ"
      : "MUEDnote Support Page - FAQ and Contact",
    alternates: {
      languages: generateHreflangAlternates("/support"),
    },
  };
}

export default async function SupportPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  // Get translations for structured data (server-side)
  const t = await getTranslations("support");
  const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"] as const;

  // Build FAQPage structured data for SEO
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqKeys.map((key) => ({
      "@type": "Question",
      "name": t(`faq.${key}.question`),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": t(`faq.${key}.answer`),
      },
    })),
  };

  return <SupportContent faqStructuredData={faqStructuredData} />;
}

interface SupportContentProps {
  faqStructuredData: object;
}

function SupportContent({ faqStructuredData }: SupportContentProps) {
  const t = useTranslations("support");

  const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"] as const;

  return (
    <div className="dark min-h-screen bg-[#0F0F1A]">
      {/* FAQPage Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 bg-[#0F0F1A]/80 backdrop-blur-xl border-b border-white/5">
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
          <h1 className="text-3xl font-bold text-white mb-8">{t("title")}</h1>

          {/* Contact Section */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">{t("contact.title")}</h2>
            <p className="text-slate-400 mb-4">{t("contact.description")}</p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="font-semibold text-white">{t("contact.company")}</p>
              <p className="text-slate-400">
                Email:{" "}
                <a href="mailto:support@glasswerks.jp" className="text-blue-400 hover:underline">
                  support@glasswerks.jp
                </a>
              </p>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-6">{t("faq.title")}</h2>
            <div className="space-y-4">
              {faqKeys.map((key) => (
                <div
                  key={key}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm"
                >
                  <h3 className="font-semibold text-white mb-2">
                    Q: {t(`faq.${key}.question`)}
                  </h3>
                  <p className="text-slate-400">
                    A: {t(`faq.${key}.answer`)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Company Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t("company.title")}</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="font-semibold text-white">{t("company.name")}</p>
              <p className="text-slate-400">{t("company.address")}</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0F0F1A] py-8 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} MUED. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link href="/privacy" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Privacy
              </Link>
              <Link href="/tokushoho" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Legal
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
