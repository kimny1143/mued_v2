"use client";

// MUEDsp — the plugin-line brand page: "the home of the suite" (GO①③ reconstruction). Dark, pro-audio
// aesthetic (glasswerks: #0a0a0a / single amber #f5a524 / max-w 3xl–5xl / 削る方向優先).
//
// Order (旗艦優先): Hero (suite entrance, text-forward) → §1 MUEDsp masterchain (the flagship, in
// development — an honest MOCK render + the planned controls + the fixed $69) → §2 free modules
// ("masterchain の段を切り出した無料版": MUEDsp saturation / MUEDsat, live + downloadable). MUEDlim
// (the limiter stage) is Phase B — hidden here until dsp's 2-knob rebuild is notarized and published.
//
// Honest-display rule: the masterchain image is a MOCK UI, NOT the shipping plugin — the caption says
// so (feedback_muedear_honest_displays_no_fakes). Required fixes: no discount wording (masterchain =
// Valhalla-type fixed $69); payment = FastSpring (MoR) at launch, never named, no live checkout.
//
// STAGED behind MUEDSP_LIVE (page.tsx robots). Saturation-block copy reuses the LIVE muedsat.*
// namespace; suite + masterchain copy is muedsp.* (content課 canonical).
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
// masterchain flagship render — an honest MOCK (minimal.html → webp, conductor-rendered). NOT the
// shipping plugin; always shown with the "開発中のUI（予定）" caption (mockLabel).
const MASTERCHAIN_MOCK = "/muedsp/masterchain-mock.webp";

// MUEDsat saturation: four knobs; Bypass is a header toggle (bypassNote, not counted).
const KNOBS = ["drive", "mix", "air", "output"] as const;
// masterchain planned controls (locked spec; shown as "こうなります" — not editable on this page).
const MC_CONTROLS = ["ceiling", "width", "mono", "limiter", "bypass"] as const;

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
  const tf = useTranslations("muedsp.free");
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
        {/* ── Hero — the suite entrance (text-forward; the flagship render is §1). ───────── */}
        <section className="relative overflow-hidden px-6 pt-16 pb-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#ff5a1f]/[0.05] blur-[120px]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full border border-[#f5a524]/30 bg-[#f5a524]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[#f5a524]">
              {th("eyebrow")}
            </span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight md:text-6xl">
              <span className="text-white">MUED</span>
              <span className="text-[#f5a524]">sp</span>
            </h1>
            <p className="mt-3 text-lg font-light text-white/80 md:text-xl">{th("tagline")}</p>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">
              {th("lead")}
            </p>
            <a
              href="#get"
              className="mt-7 inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[#f5a524] px-5 py-3 font-semibold text-black transition-colors duration-200 hover:bg-[#ffb638]"
            >
              {th("cta")}
            </a>
          </div>
        </section>

        {/* ── §1 MUEDsp masterchain — the flagship, in development. Honest MOCK render + the planned
            controls (こうなります) + fixed $69. Valhalla-type structural Buy (inert until launch;
            FastSpring MoR, never named). No discount wording; no live checkout. ─────────────────── */}
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
              {tmc("eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">{tmc("heading")}</h2>
            <p className="mt-4 text-[17px] leading-[1.8] text-white/75">{tmc("body")}</p>

            {/* the flagship visual: an honest MOCK, captioned as such (not the shipping plugin) */}
            <figure className="mt-8">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 shadow-2xl shadow-black/50">
                <Image
                  src={MASTERCHAIN_MOCK}
                  alt={
                    isJa
                      ? "MUEDsp masterchain の開発中UIモック（予定・実機ではありません）"
                      : "A mock of the in-development MUEDsp masterchain UI (planned — not the shipping product)"
                  }
                  width={1760}
                  height={1600}
                  priority
                  sizes="(min-width: 768px) 720px, 90vw"
                  className="h-auto w-full rounded-lg"
                />
              </div>
              <figcaption className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                {tmc("mockLabel")}
              </figcaption>
            </figure>

            {/* the planned controls — shown as "こうなります", not editable here */}
            <p className="mt-10 text-lg font-medium leading-snug text-white/85">
              {tmc("controlsLead")}
            </p>
            <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
              {MC_CONTROLS.map((key) => (
                <div key={key} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                  <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                    {tmc(`controls.${key}.name`)}
                  </dt>
                  <dd className="text-[15px] leading-relaxed text-white/70">
                    {tmc(`controls.${key}.desc`)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {/* Price statement lives entirely in copy (priceNote) — single source, no hardcoded
                  number (keeps price/no-discount wording under content課's control). */}
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
              {isJa ? "発売時に知らせる（MUEDsat のリストに登録） ↓" : "Get notified at launch (join the MUEDsat list) ↓"}
            </a>
          </div>
        </section>

        {/* ── §2 free modules — "masterchain の段を切り出した無料版". MUEDsp saturation (MUEDsat) is
            live + downloadable. MUEDsp limiter (MUEDlim) is Phase B: not shown until it is rebuilt
            (2-knob) + notarized + published, to avoid a lone teaser next to a live sibling. ──────── */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <p className="text-[17px] leading-[1.8] text-white/70">{tf("lead")}</p>

            {/* MUEDsp saturation (通称 MUEDsat) — the transformer-saturation stage, free + live */}
            <div className="mt-10">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                {tf("satLabel")}
              </span>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                <span className="text-white">MUED</span>
                <span className="text-[#f5a524]">sat</span>
                <span className="ml-3 align-middle font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                  {isJa ? "MUEDsp サチュレーション" : "MUEDsp saturation"}
                </span>
              </h3>
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
