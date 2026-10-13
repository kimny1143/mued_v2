// Third-party software and font licenses shipped in the MUEDsp plugins (EULA Section 9 links here).
// The texts are each plugin's English notice files, copied from the dsp repo — since 2026-10-13 AHEAD of the files
// inside the installers on the shelf, which lack three sections (lib/licenses/third-party.ts has the
// provenance and the pins); only the page chrome is localized.
import type { Metadata } from "next";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandHeader } from "@/components/brand/brand-header";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { locales, type Locale } from "@/lib/i18n/config";
import { LICENSE_KINDS, LICENSE_PLUGINS, readLicense } from "@/lib/licenses/third-party";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "licenses" });
  return {
    title: `${t("title")} | MUED`,
    description: t("intro"),
    alternates: {
      canonical: `https://mued.jp/${locale}/licenses`,
      languages: generateHreflangAlternates("/licenses"),
    },
  };
}

// The shipped files use #/## headings and fenced license texts; keep them readable, never styled as prose.
const md: Components = {
  h1: () => null, // each file's own title is replaced by the section heading below
  h2: ({ node: _n, ...p }) => <h4 className="mt-6 mb-2 text-base font-semibold text-white" {...p} />,
  h3: ({ node: _n, ...p }) => <h5 className="mt-4 mb-2 text-sm font-semibold text-white" {...p} />,
  p: ({ node: _n, ...p }) => <p className="my-2 text-sm leading-relaxed text-slate-300" {...p} />,
  ul: ({ node: _n, ...p }) => <ul className="my-2 list-disc pl-5 text-sm text-slate-300" {...p} />,
  li: ({ node: _n, ...p }) => <li className="my-0.5" {...p} />,
  a: ({ node: _n, ...p }) => <a className="text-amber-400 underline underline-offset-2 break-all" {...p} />,
  pre: ({ node: _n, ...p }) => (
    <pre className="my-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-slate-300" {...p} />
  ),
  code: ({ node: _n, ...p }) => <code className="font-mono text-xs" {...p} />,
};

export default async function LicensesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "licenses" });

  return (
    <div className="dark min-h-screen bg-bg-primary">
      <BrandHeader locale={locale} product="MUED" />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-slate-300 mb-2">{t("intro")}</p>
          <p className="text-sm text-slate-500 mb-10">{t("note")}</p>

          <nav aria-label={t("title")} className="mb-10 flex flex-wrap gap-4 text-sm">
            {LICENSE_PLUGINS.map((plugin) => (
              <a key={plugin} href={`#${plugin.toLowerCase()}`} className="text-amber-400 underline underline-offset-2">
                {t(`plugins.${plugin}`)}
              </a>
            ))}
          </nav>

          {LICENSE_PLUGINS.map((plugin) => (
            <section key={plugin} id={plugin.toLowerCase()} data-testid={`licenses-${plugin}`} className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-white mb-4">{t(`plugins.${plugin}`)}</h2>
              {LICENSE_KINDS.map((kind) => (
                <div key={kind} className="mb-8">
                  <h3 className="text-lg font-semibold text-white">
                    {t(kind === "THIRD-PARTY-LICENSES.md" ? "thirdParty" : "fonts")}
                    <span className="ml-2 font-mono text-xs text-slate-500">{kind}</span>
                  </h3>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                    {readLicense(plugin, kind)}
                  </ReactMarkdown>
                </div>
              ))}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
