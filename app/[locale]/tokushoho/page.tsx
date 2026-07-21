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
    title: locale === "ja" ? "特定商取引法に基づく表記 | MUED" : "Specified Commercial Transactions Act | MUED",
    description: locale === "ja"
      ? "MUEDサービスの特定商取引法に基づく表記"
      : "MUED Services — Specified Commercial Transactions Act Disclosure",
  };
}

export default async function TokushohoPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <TokushohoContent locale={locale} />;
}

function TokushohoContent({ locale }: { locale: string }) {
  const t = useTranslations("tokushoho");

  return (
    <div className="dark min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto flex justify-between items-center">
          <Link href={`/${locale}`} className="text-white font-semibold hover:text-slate-300 transition-colors">
            MUED
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>

          {/* ─── Common Info ─── */}
          <div className="space-y-6 mb-12">
            <InfoRow label={t("seller.title")} value={t("seller.value")} />
            <InfoRow label={t("representative.title")} value={t("representative.value")} />
            <InfoRow label={t("address.title")} value={t("address.value")} />
            <InfoRow label={t("phone.title")} value={t("phone.value")} />
            <InfoRow
              label={t("email.title")}
              value={
                <a href={`mailto:${t("email.value")}`} className="text-blue-400 hover:underline">
                  {t("email.value")}
                </a>
              }
            />
            <InfoRow label={t("additionalCost.title")} value={t("additionalCost.value")} />
            <InfoRow label={t("payment.title")} value={t("payment.value")} />
            <InfoRow label={t("contractEstablishment.title")} value={t("contractEstablishment.value")} />
          </div>

          {/* ─── Service-Specific Sections ─── */}
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-3">
            {t("servicesSectionTitle")}
          </h2>

          <div className="space-y-10">
            <ServiceSection
              name={t("muednote.name")}
              description={t("muednote.description")}
              urlTitle={t("muednote.url.title")}
              urlValue={t("muednote.url.value")}
              priceTitle={t("muednote.price.title")}
              priceDescription={t("muednote.price.description")}
              pricePlans={[
                t("muednote.price.plans.free"),
                t("muednote.price.plans.basic"),
                t("muednote.price.plans.premium"),
              ]}
              paymentTimingTitle={t("muednote.paymentTiming.title")}
              paymentTimingValue={t("muednote.paymentTiming.value")}
              deliveryTitle={t("muednote.delivery.title")}
              deliveryValue={t("muednote.delivery.value")}
              cancellationTitle={t("muednote.cancellation.title")}
              cancellationDescription={t("muednote.cancellation.description")}
              environmentTitle={t("muednote.environment.title")}
              environmentItems={[
                t("muednote.environment.web"),
                t("muednote.environment.ios"),
              ]}
            />

            <ServiceSection
              name={t("muedial.name")}
              description={t("muedial.description")}
              urlTitle={t("muedial.url.title")}
              urlValue={t("muedial.url.value")}
              priceTitle={t("muedial.price.title")}
              priceDescription={t("muedial.price.description")}
              pricePlans={[
                t("muedial.price.plans.omakase"),
                t("muedial.price.plans.dialogue"),
                t("muedial.price.plans.mastering"),
                t("muedial.price.plans.additionalCycle"),
              ]}
              paymentTimingTitle={t("muedial.paymentTiming.title")}
              paymentTimingValue={t("muedial.paymentTiming.value")}
              deliveryTitle={t("muedial.delivery.title")}
              deliveryValue={t("muedial.delivery.value")}
              cancellationTitle={t("muedial.cancellation.title")}
              cancellationDescription={t("muedial.cancellation.description")}
              environmentTitle={t("muedial.environment.title")}
              environmentItems={[
                t("muedial.environment.web"),
              ]}
            />

            {ADVISORY_LIVE && (
              <ServiceSection
                name={t("advisory.name")}
                description={t("advisory.description")}
                urlTitle={t("advisory.url.title")}
                urlValue={t("advisory.url.value")}
                priceTitle={t("advisory.price.title")}
                priceDescription={t("advisory.price.description")}
                pricePlans={[
                  t("advisory.price.plans.consult"),
                  t("advisory.price.plans.diagnosis"),
                  t("advisory.price.plans.build"),
                  t("advisory.price.plans.companion"),
                ]}
                paymentTimingTitle={t("advisory.paymentTiming.title")}
                paymentTimingValue={t("advisory.paymentTiming.value")}
                deliveryTitle={t("advisory.delivery.title")}
                deliveryValue={t("advisory.delivery.value")}
                cancellationTitle={t("advisory.cancellation.title")}
                cancellationDescription={t("advisory.cancellation.description")}
                environmentTitle={t("advisory.environment.title")}
                environmentItems={[t("advisory.environment.online")]}
                contactTitle={t("advisory.contact.title")}
                contactValue={t("advisory.contact.value")}
              />
            )}
          </div>

          {/* ─── Contact ─── */}
          <div className="mt-10">
            <InfoRow label={t("contact.title")} value={t("contact.value")} />
          </div>
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
              <Link href={`/${locale}/privacy`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Privacy
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <h2 className="font-semibold text-white mb-1">{label}</h2>
      <p className="text-slate-300">{value}</p>
    </div>
  );
}

function ServiceSection({
  name,
  description,
  urlTitle,
  urlValue,
  priceTitle,
  priceDescription,
  pricePlans,
  paymentTimingTitle,
  paymentTimingValue,
  deliveryTitle,
  deliveryValue,
  cancellationTitle,
  cancellationDescription,
  environmentTitle,
  environmentItems,
  contactTitle,
  contactValue,
}: {
  name: string;
  description: string;
  urlTitle: string;
  urlValue: string;
  priceTitle: string;
  priceDescription: string;
  pricePlans: string[];
  paymentTimingTitle: string;
  paymentTimingValue: string;
  deliveryTitle: string;
  deliveryValue: string;
  cancellationTitle: string;
  cancellationDescription: string;
  environmentTitle: string;
  environmentItems: string[];
  contactTitle?: string;
  contactValue?: string;
}) {
  return (
    <section className="border border-white/10 rounded-xl overflow-hidden">
      {/* Service header */}
      <div className="bg-white/5 px-5 py-4 border-b border-white/10">
        <h3 className="text-lg font-bold text-white">{name}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </div>

      <div className="p-5 space-y-5">
        {/* URL */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{urlTitle}</h4>
          <a href={urlValue} className="text-blue-400 hover:underline text-sm" target="_blank" rel="noopener noreferrer">
            {urlValue}
          </a>
        </div>

        {/* Price */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{priceTitle}</h4>
          <p className="text-slate-400 text-sm mb-2">{priceDescription}</p>
          <ul className="list-disc pl-6 space-y-1 text-slate-300 text-sm">
            {pricePlans.map((plan) => (
              <li key={plan}>{plan}</li>
            ))}
          </ul>
        </div>

        {/* Payment Timing */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{paymentTimingTitle}</h4>
          <p className="text-slate-300 text-sm">{paymentTimingValue}</p>
        </div>

        {/* Delivery */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{deliveryTitle}</h4>
          <p className="text-slate-300 text-sm">{deliveryValue}</p>
        </div>

        {/* Cancellation */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{cancellationTitle}</h4>
          <p className="text-slate-300 text-sm">{cancellationDescription}</p>
        </div>

        {/* Environment */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{environmentTitle}</h4>
          <ul className="list-disc pl-6 space-y-1 text-slate-300 text-sm">
            {environmentItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Contact (optional, per-service) */}
        {contactValue && (
          <div>
            <h4 className="font-semibold text-white mb-1 text-sm">{contactTitle}</h4>
            <a href={`mailto:${contactValue}`} className="text-blue-400 hover:underline text-sm">
              {contactValue}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
