import { Suspense, type ReactNode } from "react";
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
import { PaidBuyButton, type BuyProduct } from "@/components/features/muedsp-landing/masterchain-buy-button";
import { ComparePlayer, type ComparePlayerLabels } from "./compare-player";
import { PaidDemoForm, type DemoFormProduct } from "@/components/features/muedsp-landing/masterchain-try";
import { muedvoxManualPath } from "@/lib/muedvox/manual-path";

// ★The same Buy button and demo form as masterchain (#1263, #1266), given MUEDvox's own flag, words and image.
//   Both are client components: their words (muedvox.cart / muedvox.demoForm) reach the browser only while the
//   page is visible (lib/muedvox/config.ts clientMessages) — which the flags below already require.
const MUEDVOX_BUY: BuyProduct = {
  key: "muedvox",
  purchaseLive: MUEDVOX_PURCHASE_LIVE,
  cartThumb: MUEDVOX_SCREENSHOT,
  messages: "muedvox.cart",
};
const MUEDVOX_TRY: DemoFormProduct = {
  key: "muedvox",
  demoLive: MUEDVOX_DEMO_LIVE,
  endpoint: "/api/muedvox/demo",
  messages: { form: "muedvox.demoForm", demo: "muedvox.demoForm", windows: "muedvox.demoForm" },
};

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

export type MuedvoxFaqItem = { id: string; requires?: "purchase" | "demo"; question: string; answer: string };

/** FAQ answers whose subject is open: an item with `requires` shows only while that flag is on. */
export function visibleFaq(items: readonly MuedvoxFaqItem[], open: { purchase: boolean; demo: boolean }): MuedvoxFaqItem[] {
  return items.filter((item) => !item.requires || open[item.requires]);
}

export function MuedvoxLandingContent() {
  const locale = useLocale();
  const t = useTranslations("muedvox");
  const points = t.raw("points.items") as { title: string; body: string }[];
  const faq = t.raw("faq.items") as MuedvoxFaqItem[];
  const compareLabels = t.raw("beforeAfter.player") as ComparePlayerLabels;
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
              <a href="#before-after" className="mr-6 mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("hero.hear")}</a>
            )}
            {MUEDVOX_DEMO_LIVE && (
              <a href="#demo" className="mr-6 mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("hero.demo")}</a>
            )}
            {/* The manual (conductor 2026-10-16: a tester asked for one). */}
            <Link href={muedvoxManualPath(locale)} data-testid="muedvox-manual-link" className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]">{t("manual.link")}</Link>
          </div>
        </section>
        {MUEDVOX_AUDIO_EXAMPLES.length > 0 && (
          <Section id="before-after" title={t("beforeAfter.heading")}>
            {/* ★Each song is one player: Before / After and Mix / Vocals only, switched while it plays (kimny 10/14:
                the vocal sits back in the mix, so it can also be heard alone). The words go in as props — the player
                is a client component and does not read the muedvox namespace itself. */}
            {MUEDVOX_AUDIO_EXAMPLES.map((example) => (
              <figure key={example.id} className="mt-8">
                <h3 className="text-lg font-medium leading-snug text-white/85">{example.title}</h3>
                <ComparePlayer example={example} labels={compareLabels} />
              </figure>
            ))}
            <p className="mt-5 text-sm leading-relaxed text-white/45">{t("beforeAfter.caption")}</p>
          </Section>
        )}
        {MUEDVOX_SCREENSHOT && (
          <Section id="screen" title={t("screen.heading")}>
            <figure className="mt-8">
              <div className="brand-display">
                <Image src={MUEDVOX_SCREENSHOT} alt={t("screen.alt")} width={1200} height={900} sizes="(min-width: 768px) 720px, 90vw" className="h-auto w-full rounded-lg" />
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
              {(["render", "track", "live"] as const).map((mode) => (
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
              <dd className="text-[15px] leading-relaxed text-white/70">
                <p>{t("formats.formats")}</p>
                {/* ★Said plainly, next to the formats (conductor 2026-10-13; kimny decides whether it stays): the
                    Windows build ships as an unsigned zip, and Windows may warn about it. */}
                <p className="mt-2 text-sm text-white/45">{t("formats.windowsNote")}</p>
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
              <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">{t("formats.requirementsLabel")}</dt>
              <dd className="text-[15px] leading-relaxed text-white/70"><p>{t("formats.input")}</p><p>{t("formats.daw")}</p></dd>
            </div>
          </dl>
        </Section>
        {(MUEDVOX_PURCHASE_LIVE || MUEDVOX_DEMO_LIVE) && (
          <Section id="buy" title={t("buy.heading")}>
            {/* ★The Buy button opens the cart, and the cart's button is the EULA consent (kimny 10/4) — so the old
                「EULA を読み、同意します」 line is not shown here: a second, unlinked consent beside the button would
                say something the flow does not do. */}
            {MUEDVOX_PURCHASE_LIVE && (
              <div className="mt-5">
                <p className="mb-3 text-lg font-semibold text-white">{t("buy.price")}</p>
                <PaidBuyButton product={MUEDVOX_BUY} buyLabel={t("buy.button")} />
                <p className="mt-5 text-[15px] leading-relaxed text-white/70">{t("buy.afterPurchase")}</p>
              </div>
            )}
            {/* The form carries id="demo" itself (the hero's 「デモを試す」 lands on it) and its own note. */}
            {MUEDVOX_DEMO_LIVE && (
              <div className="mt-8 border-t border-white/8 pt-6">
                <Suspense fallback={null}>
                  <PaidDemoForm product={MUEDVOX_TRY} />
                </Suspense>
              </div>
            )}
          </Section>
        )}
        <Section id="faq" title={t("faq.heading")}>
          <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
            {/* ★Filtered by what each answer needs (`requires` in messages), never by position (CCO #1216):
                the key and refund answers only make sense once buying is open, the demo answer once the demo is. */}
            {visibleFaq(faq, { purchase: MUEDVOX_PURCHASE_LIVE, demo: MUEDVOX_DEMO_LIVE }).map((item) => (
              <div key={item.question} className="py-4">
                <dt className="text-[15px] font-semibold text-white/85">{item.question}</dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-white/70">
                  {item.answer}
                  {item.id === "refund" && MUEDVOX_DEMO_LIVE && <> {t("demo.refundNote")}</>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            <Link href={muedvoxManualPath(locale)} data-testid="muedvox-faq-manual-link" className="text-[#f5a524] underline underline-offset-2 transition-colors hover:text-[#ffc35a]">{t("manual.faqLink")}</Link>
          </p>
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
