"use client";

// /muedial LP (wave2 "使い始める" / 売る LP). Dark glasswerks (#0a0a0a / single amber #f5a524).
// All copy from the muedialLp.* i18n namespace (content課 canonical, EN/JA byte-exact). Structure:
// hero → 4 steps (Upload → Chat → Listen〔Before/After player〕 → Finalize) → FAQ(5) → 3宣言 +
// quiet signature → pricing (per-mix 成果課金 前面) → CTA. CTA → dial.mued.jp (the live service).
//
// Guardrails (content canonical): product-truth honest (stems ≥2, not one-click, unmanned) in
// Q2/Q4/Upload/Listen caption/CTA sub; NO payment-processor name (Stripe hidden, fix②); NO
// unbacked quality claims (precision seal); anonymous designer; per-mix pricing leads, Hoo Pass a
// light line; signature「出力はAI、判断と欲は、人間。」once, quietly at the end of the 3宣言.
//
// STAGED behind MUEDIAL_LP_LIVE (page.tsx robots). Pricing shows (kimny gate①).
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { trackCtaClick } from "@/lib/analytics/gtag";
import { BeforeAfterPlayer } from "./before-after-player";

// ?from=muedial triggers /dial's lean funnel mode (hides the redundant pitch, keeps plan-select +
// checkout) — the /muedial LP already did the selling. kimny 7/11 導線 fix.
const DIAL_URL = "https://dial.mued.jp/?from=muedial";
const STEP_KEYS = ["upload", "chat", "listen", "finalize"] as const;
const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function MuedialLpContent() {
  const locale = useLocale();
  const isJa = locale === "ja";
  const t = useTranslations("muedialLp");

  const listenLabels = {
    raw: t("listen.raw"),
    mix: t("listen.mix"),
    mastered: t("listen.mastered"),
  };

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="text-lg tracking-wide">
            <span className="font-bold">MUED</span>
            <span className="font-light text-[#f5a524]">ial</span>
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-[#f5a524]/[0.07] blur-[120px]"
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.24em] text-[#f5a524]/80">
              {t("hero.role")}
            </p>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight md:text-6xl">
              {t("hero.headline")}
            </h1>
            <p className="mt-4 text-[15px] italic text-white/45">{t("hero.origin")}</p>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-white/80">
              {t("hero.lead")}
            </p>
            <a
              href={DIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("muedial", "muedial_lp_hero")}
              className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3 font-semibold text-black transition-colors duration-200 hover:bg-[#ffb638]"
            >
              {t("hero.cta")}
            </a>
          </div>
        </section>

        {/* ── 工程4段: Upload → Chat → Listen → Finalize ────────────────────────────────── */}
        <section className="border-t border-white/5 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl space-y-12">
            {STEP_KEYS.map((key, i) => (
              <div key={key} className="grid gap-4 sm:grid-cols-[3.5rem_1fr] sm:gap-6">
                <div className="font-mono text-3xl font-bold text-[#f5a524]/40">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{t(`steps.${key}.heading`)}</h2>
                  <p className="mt-3 text-[16px] leading-[1.8] text-white/70">{t(`steps.${key}.line`)}</p>
                  {key === "listen" && (
                    <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.015] p-5 md:p-6">
                      <p className="text-center text-lg font-bold tracking-tight">{t("listen.label")}</p>
                      <p className="mt-1 mb-6 text-center text-sm text-white/50">{t("listen.sub")}</p>
                      <BeforeAfterPlayer labels={listenLabels} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 最小FAQ（購入判断・product-truth honest） ──────────────────────────────────── */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-xl font-bold tracking-tight text-white/90">{t("faq.heading")}</h2>
            <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
              {FAQ_KEYS.map((key) => (
                <div key={key} className="py-5">
                  <dt className="text-[15px] font-semibold text-white">{t(`faq.${key}.q`)}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-white/60">{t(`faq.${key}.a`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Quiet canonical signature (the 3 declarations were removed 2026-07-12 · kimny (b):
            let the signature + the real product speak, not declarations; d2/d3's substance already
            lives in the pricing/FAQ sections). One quiet line, same treatment as the home footer. ── */}
        <section className="border-t border-white/5 px-6 py-20">
          <div className="mx-auto max-w-2xl">
            <p className="text-center text-[15px] font-light italic text-white/40">
              {t("principles.signature")}
            </p>
          </div>
        </section>

        {/* ── 価格（締め・成果課金前面） ─────────────────────────────────────────────────── */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-20">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("pricing.headline")}</h2>
            <ul className="mt-8 space-y-3 text-left">
              {(["tier1", "tier2", "tier3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-3 rounded-lg border border-white/8 bg-black/20 px-4 py-3 text-[15px] text-white/85">
                  <span aria-hidden="true" className="mt-0.5 text-[#f5a524]">•</span>
                  {t(`pricing.${k}`)}
                </li>
              ))}
              <li className="flex items-start gap-3 px-4 py-1 text-sm text-white/50">
                <span aria-hidden="true" className="mt-0.5">+</span>
                {t("pricing.addon")}
              </li>
            </ul>
            <p className="mt-6 text-[15px] leading-relaxed text-white/70">{t("pricing.included")}</p>
            <p className="mt-3 text-sm text-white/40">{t("pricing.planNote")}</p>
          </div>
        </section>

        {/* ── CTA（直接アップロード開放） ────────────────────────────────────────────────── */}
        <section className="border-t border-white/5 px-6 py-24">
          <div className="mx-auto max-w-xl text-center">
            <a
              href={DIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("muedial", "muedial_lp_footer")}
              className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[#f5a524] px-7 py-4 text-lg font-semibold text-black transition-colors duration-200 hover:bg-[#ffb638]"
            >
              {t("cta.cta")}
            </a>
            <p className="mt-4 text-sm text-white/50">{t("cta.sub")}</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6">
          <Link href={`/${locale}/privacy`} className="text-sm text-white/40 transition-colors hover:text-white/70">
            {isJa ? "プライバシーポリシー" : "Privacy Policy"}
          </Link>
          <Link href={`/${locale}/tokushoho`} className="text-sm text-white/40 transition-colors hover:text-white/70">
            {isJa ? "特定商取引法に基づく表記" : "Legal"}
          </Link>
          <Link href={`/${locale}/support`} className="text-sm text-white/40 transition-colors hover:text-white/70">
            {isJa ? "サポート" : "Support"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
