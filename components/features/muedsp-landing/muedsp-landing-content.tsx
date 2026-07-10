"use client";

// MUEDsp — the plugin-line brand page (wave1 redesign). Dark, pro-audio faceplate aesthetic
// (glasswerks: #0a0a0a / single amber #f5a524 accent / max-w 3xl–5xl / 削る方向優先). This is the
// umbrella above the free MUEDsat saturator and the in-development MUEDsp masterchain flagship.
//
// Design grammar (Chief brief §6): 1 section = 1 verb = 1 moving evidence · hero = the real plugin
// render (no explanatory diagrams) · copy is chunked, not reduced · one CTA per section. The #607 DL
// v1 assets are absorbed here: the real 案D faceplate (public/muedsat/faceplate-{hot,idle}.webp) and
// the email-gate download form (MuedsatSignupForm) are reused verbatim.
//
// Required fixes: no discount/sale wording (masterchain = Valhalla-type fixed price $69) · payment is
// FastSpring (MoR) at launch — never named to the user, no live checkout yet · nothing about ads.
//
// STAGED behind MUEDSP_LIVE (page.tsx robots). Saturation-block copy reuses the LIVE muedsat.*
// namespace; hero + masterchain copy is muedsp.* (draft by mued課, final verbatim from content課).
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import {
  MuedsatSignupForm,
  MuedsatSignupFormFallback,
} from "@/components/features/muedsat-landing/muedsat-signup-form";

const FACEPLATE_HOT = "/muedsat/faceplate-hot.webp";
const FACEPLATE_IDLE = "/muedsat/faceplate-idle.webp";

// Four knobs; Bypass is a header toggle, described once in bypassNote (not counted).
const KNOBS = ["drive", "mix", "air", "output"] as const;

// The form reads useSearchParams (UTM + press bypass) → needs a Suspense boundary on this
// statically-prerendered page.
function SignupForm() {
  return (
    <Suspense fallback={<MuedsatSignupFormFallback />}>
      <MuedsatSignupForm />
    </Suspense>
  );
}

export function MuedspLandingContent() {
  const locale = useLocale();
  const isJa = locale === "ja";

  const th = useTranslations("muedsp.hero");
  const tmc = useTranslations("muedsp.masterchain");
  // Saturation block reuses the shipped MUEDsat copy.
  const tsHero = useTranslations("muedsat.hero");
  const tsAbout = useTranslations("muedsat.about");
  const tsWhy = useTranslations("muedsat.whyFree");
  const tsViz = useTranslations("muedsat.visuals");
  const tsFoot = useTranslations("muedsat.footer");

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="flex items-baseline gap-2">
            <span className="text-lg tracking-wide">
              <span className="font-bold">MUED</span>
              <span className="font-light text-[#f5a524]">sp</span>
            </span>
            <span className="hidden text-[11px] uppercase tracking-widest text-white/30 sm:inline">
              {isJa ? "マスタリング用プラグイン" : "Plugins for mastering"}
            </span>
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main>
        {/* ── Hero — the plugin line, one real render, one CTA ─────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-14 pb-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/4 h-[480px] w-[480px] translate-x-1/3 rounded-full bg-[#ff5a1f]/[0.06] blur-[110px]"
          />
          <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <span className="inline-block rounded-full border border-[#f5a524]/30 bg-[#f5a524]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[#f5a524]">
                {th("eyebrow")}
              </span>
              <h1 className="mt-5 text-5xl font-extrabold tracking-tight md:text-6xl">
                <span className="text-white">MUED</span>
                <span className="text-[#f5a524]">sp</span>
              </h1>
              <p className="mt-3 text-lg font-light text-white/80 md:text-xl">{th("tagline")}</p>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">{th("lead")}</p>
              <a
                href="#get"
                className="mt-7 inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[#f5a524] px-5 py-3 font-semibold text-black transition-colors duration-200 hover:bg-[#ffb638]"
              >
                {th("cta")}
              </a>
            </div>
            <div className="mx-auto w-full max-w-md md:max-w-none">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 shadow-2xl shadow-black/50">
                <Image
                  src={FACEPLATE_HOT}
                  alt={tsViz("faceplateAlt")}
                  width={1000}
                  height={700}
                  priority
                  sizes="(min-width: 768px) 440px, 88vw"
                  className="h-auto w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── MUEDsat (saturation) — the free, live product: what it is + download ──────── */}
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                {tsHero("badge")}
              </span>
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              <span className="text-white">MUED</span>
              <span className="text-[#f5a524]">sat</span>
              <span className="ml-3 align-middle font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                {isJa ? "MUEDsp サチュレーション" : "MUEDsp saturation"}
              </span>
            </h2>
            <p className="mt-4 text-lg font-light text-white/80">{tsHero("tagline")}</p>
            <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{tsAbout("originLead")}</p>

            {/* one moving evidence: the same UI idle vs driven (transfer-curve story) */}
            <figure className="mt-8">
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30 p-1.5">
                    <Image
                      src={FACEPLATE_IDLE}
                      alt={tsViz("compareAlt")}
                      width={1000}
                      height={700}
                      sizes="(min-width: 640px) 40vw, 88vw"
                      className="h-auto w-full rounded"
                    />
                  </div>
                  <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                    {tsViz("idleLabel")}
                  </p>
                </div>
                <div>
                  <div className="overflow-hidden rounded-lg border border-[#ff5a1f]/25 bg-black/30 p-1.5 shadow-[0_0_32px_-14px_rgba(255,90,31,0.4)]">
                    <Image
                      src={FACEPLATE_HOT}
                      alt=""
                      aria-hidden="true"
                      width={1000}
                      height={700}
                      sizes="(min-width: 640px) 40vw, 88vw"
                      className="h-auto w-full rounded"
                    />
                  </div>
                  <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#f5a524]/70">
                    {tsViz("hotLabel")}
                  </p>
                </div>
              </div>
            </figure>

            {/* four knobs — shown plainly; Bypass in one quiet line */}
            <p className="mt-10 text-lg font-medium leading-snug text-white/85">
              {tsAbout("controlsLead")}
            </p>
            <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
              {KNOBS.map((key) => (
                <div key={key} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                  <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                    {tsAbout(`controls.${key}.name`)}
                  </dt>
                  <dd className="text-[15px] leading-relaxed text-white/70">
                    {tsAbout(`controls.${key}.desc`)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-white/45">{tsAbout("bypassNote")}</p>

            {/* the CTA for this section: the free download (email gate) */}
            <div id="get" className="mt-8 max-w-md scroll-mt-20">
              <SignupForm />
            </div>
            <p className="mt-3 max-w-md text-sm italic text-white/45">{tsHero("tryLine")}</p>
            <p className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-white/55">{tsWhy("lead")}</p>
          </div>
        </section>

        {/* ── MUEDsp masterchain — the finished form, in development. Valhalla-type fixed-price
            "予告" (structural Buy placement until launch). No discount wording; no live checkout. ── */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.03] to-transparent p-6 md:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                {tmc("eyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">{tmc("heading")}</h2>
              <p className="mt-4 text-[17px] leading-[1.8] text-white/75">{tmc("body")}</p>

              <div className="mt-7 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {/* Price statement lives entirely in copy (priceNote) — single source, no hardcoded
                    number in the component (keeps price changes to one layer, and the fixed-price /
                    no-discount wording under content課's control). */}
                <p className="max-w-sm text-[15px] leading-relaxed text-white/70">{tmc("priceNote")}</p>
                {/* Valhalla-type structural Buy slot — present but inert until launch (FastSpring MoR). */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="shrink-0 cursor-not-allowed rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white/40"
                >
                  {tmc("buyLabel")}
                </button>
              </div>
              <a
                href="#get"
                className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]"
              >
                {isJa ? "発売時に知らせる（MUEDsat のリストに登録） ↑" : "Get notified at launch (join the MUEDsat list) ↑"}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-2.5">
          <p className="text-sm text-white/50">{tsFoot("operator")}</p>
          <p className="font-mono text-xs uppercase tracking-wider text-white/35">{tsFoot("format")}</p>
          <nav className="flex items-center gap-6 pt-1">
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
          </nav>
        </div>
      </footer>
    </div>
  );
}
