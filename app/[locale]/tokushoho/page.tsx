import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_WINDOWS_LIVE } from "@/lib/masterchain/config";
import { WINDOWS_BETA_LIVE } from "@/lib/plugins/windows-beta";
import { BrandHeader } from "@/components/brand/brand-header";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { ADVISORY_LIVE } from "@/lib/advisory/config";
import { MUEDSP_LIVE } from "@/lib/muedsp/config";

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
    alternates: {
      // Self-referencing canonical. Without it, /ja/tokushoho and /en/tokushoho sit in the sitemap
      // as near-identical pages with no declared preference, and Search Console reports
      // "Duplicate, Google chose different canonical than user" — literally: the user
      // (this site) never chose one.
      canonical: `https://mued.jp/${locale}/tokushoho`,
      languages: generateHreflangAlternates("/tokushoho"),
    },
  };
}

export default async function TokushohoPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <TokushohoContent locale={locale} />;
}

function TokushohoContent({ locale }: { locale: string }) {
  const t = useTranslations("tokushoho");
  const twin = useTranslations("muedsp.windows");

  return (
    <div className="dark min-h-screen bg-bg-primary">
      {/* Header */}
      <BrandHeader locale={locale} product="MUED" />

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("lastUpdated")}</p>

          {/* ─── Common Info ─── */}
          <div className="space-y-6 mb-12">
            <InfoRow label={t("seller.title")} value={t("seller.value")} />
            {/* ★有料プラグインは Merchant of Record が FastSpring ∴ 上の「販売業者」だけでは
                誰が売ったのかが表示として不足する。2行の表記は /terms・/refund と byte 同一
                （tests が3面の一致を測る）。 */}
            <InfoRow label={t("mor.title")} value={t("mor.value")} />
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
            {/* ★FastSpring 分の成立時期は ★FastSpring 自身の規約に従わせている。★簡略化しないこと。
                正本＝FastSpring® Terms & Conditions of Sale for Purchasers（Last Updated 2021-10-28）
                https://fastspring.com/legal/terms-sale/
                  §3.4 … "Any order confirmation email received by you prior to our Acceptance shall
                          constitute an acknowledgement of our receipt of your offer only, and not an
                          acceptance of your offer."
                  §3.6 … Acceptance ＝ (a) product を dispatch／service へ access を提供 ★かつ
                          (b) 代金の settlement を受領 —— ★その両方が揃った時点
                ★当課は当初「注文確認メールの送信をもって成立」と書いており、★これは §3.4 と真逆だった
                （conductor lint が一次を引いて指摘・当課も一次を照合して確認）。
                ★当製品の (a) は、ポータルでのライセンスキーの取得方法を記載したメールの送信（kimny 2026-09-28・鍵はメールに載せない）。 */}
            <InfoRow label={t("contractEstablishment.title")} value={t("contractEstablishment.value")} />
          </div>

          {/* ─── Service-Specific Sections ─── */}
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-3">
            {t("servicesSectionTitle")}
          </h2>

          <div className="space-y-10">
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

            {/* ★動作環境の値は ★実物の installer から採った（site copy から写していない）:
                MUEDsp-masterchain-1.0.1-installer.pkg で 2026-09-30 に再測（初回は 0.1.3・2026-09-16・1.0.0 も同値）。pkgutil --expand-full → VST3 / AU / AAX、
                  xar -tf   → VST3 / AU / AAX の3 sub-package（install-location もそれぞれ確認）
                  lipo      → x86_64 + arm64（∴ Universal）
                  otool -l  → LC_BUILD_VERSION minos 11.0（∴ macOS 11.0 以降）
                ★minos は site copy のどこにも書かれていない ∴ ここが初出。
                メモリの記載は kimny 承認（2026-09-23）の推奨値であり、installer の実測値ではない。
                ★∴ installer を差し替えた日に この3行は ★黙って古くなる（法定表記なのに何も失敗しない）。
                再測は status.md (W0) の「次に .pkg を差し替えた日」に束ねてある。 */}
            {MUEDSP_LIVE && (
              <ServiceSection
                name={t("muedsp.name")}
                description={t("muedsp.description")}
                urlTitle={t("muedsp.url.title")}
                urlValue={t("muedsp.url.value")}
                priceTitle={t("muedsp.price.title")}
                priceDescription={t("muedsp.price.description")}
                pricePlans={[
                  t("muedsp.price.plans.masterchain"),
                  t("muedsp.price.plans.free"),
                  t("muedsp.price.plans.note"),
                ]}
                paymentTimingTitle={t("muedsp.paymentTiming.title")}
                paymentTimingValue={t("muedsp.paymentTiming.value")}
                deliveryTitle={t("muedsp.delivery.title")}
                deliveryValue={t("muedsp.delivery.value")}
                cancellationTitle={t("muedsp.cancellation.title")}
                cancellationDescription={t("muedsp.cancellation.description")}
                cancellationDemo={MASTERCHAIN_DEMO_LIVE ? t("muedsp.cancellation.demo") : undefined}
                environmentTitle={t("muedsp.environment.title")}
                environmentItems={[
                  t("muedsp.environment.os"),
                  t("muedsp.environment.mac"),
                  t("muedsp.environment.memory"),
                  t("muedsp.environment.formats"),
                  t("muedsp.environment.host"),
                  // ★The Windows line follows what is actually offered (conductor 2026-10-01). While neither flag is on
                  //   it is the same sentence as before — tests/unit/windows-launch-prep.test.ts.
                  MASTERCHAIN_WINDOWS_LIVE
                    ? twin("tokushohoAll")
                    : WINDOWS_BETA_LIVE
                      ? twin("tokushohoFree")
                      : t("muedsp.environment.windows"),
                ]}
                contactTitle={t("muedsp.contact.title")}
                contactValue={t("muedsp.contact.value")}
              />
            )}

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
                  t("advisory.price.plans.program"),
                  t("advisory.price.plans.guardian"),
                  t("advisory.price.plans.spot"),
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
              <Link href={`/${locale}/terms`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Terms
              </Link>
              <Link href={`/${locale}/refund`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Refund
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
      {/* whitespace-pre-line: グローバル欄のうち 支払方法 / 契約成立時期 / 商品代金以外の必要料金 /
          有料プラグインの販売事業者 は ★サービスごとに行を分けてある。CSS 既定の white-space:normal
          は改行を潰すので、無いと「Stripe 経由」と「FastSpring のチェックアウト」が1つの塊で描画され、
          どのサービスにどの決済手段が適用されるのか読めなくなる（＝法定表記として成立しない）。
          ★要否は tests/unit/tokushoho-newline-render.test.ts が messages 側から機械的に測る。 */}
      <p className="text-slate-300 whitespace-pre-line">{value}</p>
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
  cancellationDemo,
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
  cancellationDemo?: string;
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
          {/* ★whitespace-pre-line: 訳文に段落区切りの改行が入っている（muedial / advisory の
              支払時期は「都度購入」と「Hoo Pass」で段を分けてある）。CSS 既定の
              white-space:normal は改行を潰すので、無いと法定表記が1つの塊で描画される。
              ★この class の要否は tests/unit/tokushoho-newline-render.test.ts が実測で守る。 */}
          <p className="text-slate-300 text-sm whitespace-pre-line">{paymentTimingValue}</p>
        </div>

        {/* Delivery */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{deliveryTitle}</h4>
          <p className="text-slate-300 text-sm">{deliveryValue}</p>
        </div>

        {/* Cancellation */}
        <div>
          <h4 className="font-semibold text-white mb-1 text-sm">{cancellationTitle}</h4>
          <p className="text-slate-300 text-sm whitespace-pre-line">{cancellationDescription}</p>
          {cancellationDemo && <p className="mt-2 text-slate-300 text-sm">{cancellationDemo}</p>}
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
