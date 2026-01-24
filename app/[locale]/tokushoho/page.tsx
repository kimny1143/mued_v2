import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n/config";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return {
    title: locale === "ja" ? "特定商取引法に基づく表記 | MUEDnote" : "Commerce Disclosure | MUEDnote",
    description: locale === "ja"
      ? "MUEDnoteの特定商取引法に基づく表記"
      : "MUEDnote Commerce Disclosure (Specified Commercial Transactions Act)",
  };
}

export default async function TokushohoPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <TokushohoContent />;
}

function TokushohoContent() {
  const t = useTranslations("tokushoho");

  return (
    <div className="dark min-h-screen bg-[#0F0F1A]">
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
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>

          <div className="space-y-6">
            {/* Seller / Business Name */}
            <InfoRow label={t("seller.title")} value={t("seller.value")} />

            {/* Address */}
            <InfoRow label={t("address.title")} value={t("address.value")} />

            {/* Phone */}
            <InfoRow label={t("phone.title")} value={t("phone.value")} />

            {/* Email */}
            <InfoRow
              label={t("email.title")}
              value={
                <a href={`mailto:${t("email.value")}`} className="text-blue-400 hover:underline">
                  {t("email.value")}
                </a>
              }
            />

            {/* Operations Manager / Representative */}
            <InfoRow label={t("representative.title")} value={t("representative.value")} />

            {/* Service Name */}
            <InfoRow label={t("serviceName.title")} value={t("serviceName.value")} />

            {/* Price */}
            <section className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h2 className="font-semibold text-white mb-2">{t("price.title")}</h2>
              <p className="text-slate-400 mb-3">{t("price.description")}</p>
              <ul className="list-disc pl-6 space-y-1 text-slate-300">
                <li>{t("price.plans.free")}</li>
                <li>{t("price.plans.basic")}</li>
                <li>{t("price.plans.premium")}</li>
              </ul>
            </section>

            {/* Additional Cost */}
            <InfoRow label={t("additionalCost.title")} value={t("additionalCost.value")} />

            {/* Payment */}
            <InfoRow label={t("payment.title")} value={t("payment.value")} />

            {/* Payment Timing */}
            <InfoRow label={t("paymentTiming.title")} value={t("paymentTiming.value")} />

            {/* Delivery */}
            <InfoRow label={t("delivery.title")} value={t("delivery.value")} />

            {/* Return Policy */}
            <section className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h2 className="font-semibold text-white mb-4">{t("returnPolicy.title")}</h2>

              {/* Customer Return */}
              <div className="mb-4">
                <h3 className="font-medium text-slate-200 mb-2">{t("returnPolicy.customerReturn.subtitle")}</h3>
                <p className="text-slate-300">{t("returnPolicy.customerReturn.description")}</p>
              </div>

              {/* Defect */}
              <div>
                <h3 className="font-medium text-slate-200 mb-2">{t("returnPolicy.defect.subtitle")}</h3>
                <p className="text-slate-300">{t("returnPolicy.defect.description")}</p>
              </div>
            </section>

            {/* Environment */}
            <section className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h2 className="font-semibold text-white mb-2">{t("environment.title")}</h2>
              <ul className="list-disc pl-6 space-y-1 text-slate-300">
                <li>{t("environment.web")}</li>
                <li>{t("environment.ios")}</li>
              </ul>
            </section>

            {/* Contact */}
            <InfoRow label={t("contact.title")} value={t("contact.value")} />
          </div>
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <h2 className="font-semibold text-white mb-1">{label}</h2>
      <p className="text-slate-300">{value}</p>
    </div>
  );
}
