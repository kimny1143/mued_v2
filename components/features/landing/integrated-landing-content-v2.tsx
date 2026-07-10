"use client";

// Portal redesign (wave1 mock). Reworks the mued.jp home from ~13 sections / 11 CTAs down to
// ~7 sections / ~5 CTAs (each product = ONE section, ONE CTA), in工程順 MIX → MASTER → TRAIN.
//
// Positioning A (kimny 7/10): PRODUCTS LEAD. Philosophy is NOT front-loaded — it sits at the bottom
// as one quiet quote + a /philosophy Read-more link, and as a one-line 出自 (origin) on each product.
// The 3 宣言 live on /muedial + /philosophy, not here. Standing rule: 「哲学は下・出自は各製品に一行」.
//
// Design grammar (Chief brief §6): 1 section = 1 verb = 1 moving evidence (real product render, no
// explanatory diagram) · copy is chunked, not reduced · glasswerks tokens (#0a0a0a / single amber
// #f5a524 accent / max-w 5xl / 削る方向優先). v1 uses poster stills (the real renders) — silent-loop
// UI video is a later step, shared with the #607 DL work.
//
// De-clutter main move: MUEDear's 5 detail sub-sections are demoted to /muedear (a later wave); here
// it is a single TRAIN card. Advisory (current #11) is migrated verbatim (v7, ja-only, not in nav).
// FloatingNav / SectionNav / claude-code-template variant are dropped.
//
// Required fixes honored via copy (content課 canonical): no discount/sale wording, no processor name
// (FastSpring MoR is never surfaced), no MUEDear ads, no SNS clip formalization, no "studio-grade
// precision" claim. All copy comes from the landing.v2.* i18n namespace.
//
// STAGED: rendered by app/[locale]/redesign/page.tsx (noindex, no auth redirect) for the kimny 現物
// gate. The live home (integrated-landing-content.tsx) is untouched until the redesign is approved.
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { trackCtaClick } from "@/lib/analytics/gtag";

const MUEDIAL_URL = "https://dial.mued.jp";

// Real product renders (v1 poster stills). MASTER reuses the #607 案D faceplate.
const RENDER_MIX = "/muedial-hoo-mixing-console.webp";
const RENDER_MASTER = "/muedsat/faceplate-hot.webp";
const RENDER_TRAIN = "/muedear-hero-bg.webp";

export function IntegratedLandingContentV2() {
  const locale = useLocale();
  const isJa = locale === "ja";
  const t = useTranslations("landing.v2");

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      {/* Header — lean: wordmark + login + locale. No FloatingNav, no in-page anchor nav. */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-wide text-white">
            MUED
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/sign-in"
              className="flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
            >
              <LogIn className="h-3.5 w-3.5" />
              {isJa ? "ログイン" : "Log In"}
            </Link>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main>
        {/* ── Brand hero — one line of what MUED is, one soft scroll cue ─────────────────── */}
        <section className="relative overflow-hidden px-6 pt-24 pb-24 md:pt-32 md:pb-32">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#f5a524]/[0.07] blur-[130px]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[#f5a524]/80">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-6 text-6xl font-extrabold tracking-tight md:text-8xl">MUED</h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/70 md:text-xl">
              {t("hero.lead")}
            </p>
            <a
              href="#mix"
              className="mt-9 inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              {t("hero.cta")}
            </a>
          </div>
        </section>

        {/* ── MIX — MUEDial (live conversion → dial.mued.jp). Image right. ───────────────── */}
        <ProductSection
          id="mix"
          label={t("mix.label")}
          heading={t("mix.heading")}
          lead={t("mix.lead")}
          body={t("mix.body")}
          origin={t("mix.origin")}
          render={RENDER_MIX}
          renderAlt={isJa ? "MUEDial のミキシングコンソール画面" : "The MUEDial mixing console"}
          renderW={2752}
          renderH={1536}
          cta={
            <ExternalCta href={MUEDIAL_URL} product="muedial" location="portal_mix">
              {t("mix.cta")}
            </ExternalCta>
          }
        />

        {/* ── MASTER — MUEDsp (→ /muedsp). Image left. ──────────────────────────────────── */}
        <ProductSection
          id="master"
          label={t("master.label")}
          heading={t("master.heading")}
          lead={t("master.lead")}
          body={t("master.body")}
          origin={t("master.origin")}
          render={RENDER_MASTER}
          renderAlt={isJa ? "MUEDsp のプラグイン画面" : "The MUEDsp plugin interface"}
          renderW={1000}
          renderH={700}
          reverse
          surface
          cta={
            <Link
              href={`/${locale}/muedsp`}
              onClick={() => trackCtaClick("muedsp", "portal_master")}
              className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[#f5a524] px-5 py-3 font-semibold text-black transition-colors duration-200 hover:bg-[#ffb638]"
            >
              {t("master.cta")}
            </Link>
          }
        />

        {/* ── TRAIN — MUEDear (→ App Store). Demoted from 5 sub-sections to one card. Image right. ── */}
        <ProductSection
          id="train"
          label={t("train.label")}
          heading={t("train.heading")}
          lead={t("train.lead")}
          body={t("train.body")}
          origin={t("train.origin")}
          render={RENDER_TRAIN}
          renderAlt={isJa ? "MUEDear の耳トレ画面" : "The MUEDear ear-training app"}
          renderW={2816}
          renderH={1536}
          cta={
            <AppStoreButton
              href={MUEDEAR_APP_STORE_URL}
              color="amber"
              size="large"
              product="muedear"
              ctaLocation="portal_train"
            />
          }
        />

        {/* ── Advisory — ja only, v7 verbatim, migrated with the new dark system. Not in nav. ── */}
        {isJa && (
          <section className="border-t border-white/5 bg-white/[0.015] px-6 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                {t("advisory.heading")}
              </h2>
              <p className="mt-5 text-lg text-white/70">{t("advisory.lead")}</p>
              <Link
                href={`/${locale}/advisory`}
                onClick={() => trackCtaClick("advisory", "portal_advisory")}
                className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-lg)] border-2 border-white/25 px-5 py-3 font-medium text-white transition-colors duration-200 hover:bg-white hover:text-black"
              >
                {t("advisory.cta")}
              </Link>
            </div>
          </section>
        )}

        {/* ── Close — single focus on the most live conversion (MUEDial). ───────────────── */}
        <section className="border-t border-white/5 px-6 py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              {t("close.heading")}
            </h2>
            <p className="mt-5 text-lg text-white/70">{t("close.lead")}</p>
            <div className="mt-9">
              <ExternalCta href={MUEDIAL_URL} product="muedial" location="portal_close" primary>
                {t("close.cta")}
              </ExternalCta>
            </div>
          </div>
        </section>

        {/* ── Philosophy — placed at the BOTTOM per positioning A (kimny 7/10): products lead;
            philosophy is one quiet quote + a Read-more link, never front-loaded. The 3 宣言 live on
            /muedial + /philosophy, not here. Standing rule: 「哲学は下」. ── */}
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-lg font-light italic leading-relaxed text-white/45 md:text-xl">
              {t("philosophy.quote")}
            </p>
            <Link
              href={`/${locale}/philosophy`}
              onClick={() => trackCtaClick("philosophy", "portal_philosophy_footer")}
              className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#f5a524]/80 transition-colors hover:text-[#ffc35a]"
            >
              {t("philosophy.cta")}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} MUED. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href={`/${locale}/privacy`}
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              {isJa ? "プライバシーポリシー" : "Privacy Policy"}
            </Link>
            <Link
              href={`/${locale}/tokushoho`}
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              {isJa ? "特定商取引法に基づく表記" : "Legal"}
            </Link>
            {isJa && (
              <Link
                href={`/${locale}/advisory`}
                className="text-sm text-white/40 transition-colors hover:text-white/70"
              >
                無料60分相談
              </Link>
            )}
            <Link
              href={`/${locale}/support`}
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              {isJa ? "サポート" : "Support"}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/**
 * One product = one section: label + heading + chunked lead/body + one real render + one CTA.
 * `reverse` flips the image side; `surface` uses the subtle raised background for rhythm.
 */
function ProductSection({
  id,
  label,
  heading,
  lead,
  body,
  origin,
  render,
  renderAlt,
  renderW,
  renderH,
  cta,
  reverse = false,
  surface = false,
}: {
  id: string;
  label: string;
  heading: string;
  lead: string;
  body: string;
  origin?: string;
  render: string;
  renderAlt: string;
  renderW: number;
  renderH: number;
  cta: React.ReactNode;
  reverse?: boolean;
  surface?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-16 border-t border-white/5 px-6 py-20 md:py-28 ${
        surface ? "bg-white/[0.015]" : ""
      }`}
    >
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-14">
        <div className={reverse ? "md:order-2" : ""}>
          <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.28em] text-[#f5a524]">
            {label}
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">{heading}</h2>
          <p className="mt-4 text-xl font-light text-white/85">{lead}</p>
          <p className="mt-4 max-w-md text-[16px] leading-[1.8] text-white/60">{body}</p>
          {/* 出自の一行 (origin) — positioning A: each product carries its provenance, so philosophy
              is woven in per-product instead of front-loaded. */}
          {origin ? <p className="mt-4 max-w-md text-sm italic text-white/40">{origin}</p> : null}
          <div className="mt-8">{cta}</div>
        </div>
        <div className={reverse ? "md:order-1" : ""}>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 shadow-2xl shadow-black/50">
            <Image
              src={render}
              alt={renderAlt}
              width={renderW}
              height={renderH}
              sizes="(min-width: 768px) 480px, 92vw"
              className="h-auto w-full rounded-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** External CTA (dial.mued.jp) with analytics. `primary` = filled amber; default = amber outline. */
function ExternalCta({
  href,
  product,
  location,
  primary = false,
  children,
}: {
  href: string;
  product: string;
  location: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackCtaClick(product, location)}
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3 font-semibold text-black transition-colors duration-200 hover:bg-[#ffb638]"
          : "inline-flex items-center gap-2 rounded-[var(--radius-lg)] border-2 border-[#f5a524] px-5 py-3 font-medium text-[#f5a524] transition-colors duration-200 hover:bg-[#f5a524] hover:text-black"
      }
    >
      {children}
    </a>
  );
}
