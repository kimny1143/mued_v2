import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import {
  MUEDVOX_AUDIO_EXAMPLES,
  MUEDVOX_SCREENSHOT,
  MUEDVOX_PURCHASE_LIVE,
  MUEDVOX_DEMO_LIVE,
} from "@/lib/muedvox/config";

// Typography, widths, rules and figure treatment follow MUEDsp's masterchain block.
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="border-t border-white/5 px-6 py-14">
      <div className="mx-auto max-w-3xl">
        <h2 id={`${id}-heading`} className="mt-3 text-3xl font-bold tracking-tight text-white">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function MuedvoxLandingContent() {
  const locale = useLocale();
  const t = useTranslations("muedvox");
  const points = t.raw("points.items") as { title: string; body: string }[];
  const faq = t.raw("faq.items") as { question: string; answer: string }[];
  return (
    <div className="brand-product dark min-h-screen bg-[var(--bg-base)] text-white">
      <header className="brand-header">
        <div className="brand-header-inner">
          <Link href={`/${locale}`}><BrandMark product="MUEDvox" /></Link>
          <div className="brand-header-actions"><LocaleSwitcher /></div>
        </div>
      </header>
      <main>
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">{t("hero.eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">{t("hero.title")}</h1>
            <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{t("hero.lead")}</p>
            {MUEDVOX_AUDIO_EXAMPLES.length > 0 && (
              <a href="#before-after" className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("hero.hear")}</a>
            )}
            {MUEDVOX_DEMO_LIVE && (
              <a href="#demo" className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("hero.demo")}</a>
            )}
          </div>
        </section>
        {MUEDVOX_AUDIO_EXAMPLES.length > 0 && (
          <Section id="before-after" title={t("beforeAfter.heading")}>
            {MUEDVOX_AUDIO_EXAMPLES.map((example, index) => (
              <figure key={example.before} className="mt-8">
                <h3 className="text-lg font-medium leading-snug text-white/85">
                  {example.label === "example1" || example.label === "example2" ? t(`beforeAfter.${example.label}`) : example.label}
                </h3>
                <div className="mt-5 divide-y divide-white/5 border-y border-white/5">
                  {(["before", "after"] as const).map((side) => (
                    <div key={side} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                      <p id={`audio-${index}-${side}`} className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">{t(`beforeAfter.${side}`)}</p>
                      <audio controls preload="none" src={example[side]} aria-labelledby={`audio-${index}-${side}`} />
                    </div>
                  ))}
                </div>
                <figcaption className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{t("beforeAfter.caption")}</figcaption>
              </figure>
            ))}
          </Section>
        )}
        {MUEDVOX_SCREENSHOT && (
          <Section id="screen" title={t("screen.heading")}>
            <figure className="mt-8">
              <div className="brand-display">
                <Image src={MUEDVOX_SCREENSHOT} alt={t("screen.alt")} width={1200} height={800} sizes="(min-width: 768px) 720px, 90vw" className="h-auto w-full rounded-lg" />
              </div>
              <figcaption className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{t("screen.caption")}</figcaption>
            </figure>
          </Section>
        )}
        <Section id="points" title={t("points.heading")}>
          <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
            {points.map((point) => (
              <div key={point.title} className="py-4">
                <dt className="text-lg font-medium leading-snug text-white/85">{point.title}</dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-white/70">{point.body}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section id="modes" title={t("modes.heading")}>
          <table className="mt-5 w-full border-y border-white/5 text-left text-[15px] leading-relaxed text-white/70">
            <thead><tr>{(["mode", "latency", "use"] as const).map((key) => (
              <th key={key} scope="col" className="py-3 pr-5 font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">{t(`modes.${key}`)}</th>
            ))}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {(["track", "live"] as const).map((mode) => (
                <tr key={mode}>
                  <th scope="row" className="py-3 pr-5 font-semibold text-white/85">{t(`modes.${mode}.name`)}</th>
                  <td className="py-3 pr-5">{t(`modes.${mode}.latency`)}</td>
                  <td className="py-3">{t(`modes.${mode}.use`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm leading-relaxed text-white/45">{t("modes.note")}</p>
        </Section>
        <Section id="formats" title={t("formats.heading")}>
          <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
            <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
              <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">{t("formats.formatsLabel")}</dt>
              <dd className="text-[15px] leading-relaxed text-white/70">{t("formats.formats")}</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
              <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">{t("formats.requirementsLabel")}</dt>
              <dd className="text-[15px] leading-relaxed text-white/70"><p>{t("formats.input")}</p><p>{t("formats.daw")}</p></dd>
            </div>
          </dl>
        </Section>
        {(MUEDVOX_PURCHASE_LIVE || MUEDVOX_DEMO_LIVE) && (
          <Section id="buy" title={t("buy.heading")}>
            {/* ★No buy / demo BUTTON here on purpose: the checkout (FastSpring path in lib/plugins/paid-products.ts)
                and the demo download gate land in PR-C (docs/paid-line/c9-…). A placeholder button would render as
                a real-looking one the moment a flag is flipped early. */}
            {MUEDVOX_PURCHASE_LIVE && (
              <div className="mt-5">
                <p className="mb-3 text-lg font-semibold text-white">{t("buy.price")}</p>
                <p className="mt-4 text-sm leading-relaxed text-white/45"><Link href={`/${locale}/eula`}>{t("buy.consent")}</Link></p>
                <p className="mt-5 text-[15px] leading-relaxed text-white/70">{t("buy.afterPurchase")}</p>
              </div>
            )}
            {MUEDVOX_DEMO_LIVE && (
              <div id="demo" className="mt-8 space-y-4 border-t border-white/8 pt-6">
                <p className="text-[15px] leading-relaxed text-white/70">{t("demo.body")}</p>
              </div>
            )}
          </Section>
        )}
        <Section id="faq" title={t("faq.heading")}>
          <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
            {faq.map((item, index) => index === 6 && !MUEDVOX_DEMO_LIVE ? null : (
              <div key={item.question} className="py-4">
                <dt className="text-[15px] font-semibold text-white/85">{item.question}</dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-white/70">
                  {item.answer}
                  {index === 7 && MUEDVOX_DEMO_LIVE && <> {t("demo.refundNote")}</>}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section id="legal" title={t("legal.heading")}>
          <Link href={`/${locale}/eula`} className="mt-5 inline-flex text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("legal.eula")}</Link>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">{t("legal.thirdParty")}</p>
        </Section>
      </main>
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-3xl"><p className="text-sm text-white/50">{t("legal.footer")}</p></div>
      </footer>
    </div>
  );
}
