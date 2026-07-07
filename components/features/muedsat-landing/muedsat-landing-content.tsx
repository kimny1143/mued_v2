"use client";

// MUEDsat free-download LP — dark, pro-audio faceplate aesthetic (not the advisory light editorial
// theme). Dark metallic + amber (glasswerks --amber #f5a524). All copy comes from the `muedsat.*` i18n
// namespace (messages/{en,ja}.json) — no hardcoded copy. Staged behind MUEDSAT_LIVE (page.tsx robots).
import { Suspense } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { MUEDSAT_MUEDSP_URL } from "@/lib/muedsat/config";
import { MuedsatSignupForm, MuedsatSignupFormFallback } from "./muedsat-signup-form";

// The form reads useSearchParams (UTM + press bypass), so it must sit under a Suspense boundary on
// this statically-prerendered page.
function SignupForm() {
  return (
    <Suspense fallback={<MuedsatSignupFormFallback />}>
      <MuedsatSignupForm />
    </Suspense>
  );
}

const CONTROL_KEYS = ["drive", "air", "mix", "output", "bypass"] as const;

// Transformer-style saturation transfer curve — the literal character of the plugin, drawn as its
// signature. Faint unity diagonal + a soft-clip (tanh) response in amber.
function SaturationCurve() {
  const pts: string[] = [];
  const k = 2.6; // drive amount for the illustrative curve
  const norm = Math.tanh(k);
  for (let i = 0; i <= 60; i++) {
    const x = i / 60; // 0..1
    const sx = 10 + x * 180;
    const sy = 190 - (Math.tanh(k * x) / norm) * 180;
    pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="msatCurve" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#b57a14" />
          <stop offset="1" stopColor="#f5a524" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`h${i}`} x1="10" y1={10 + i * 45} x2="190" y2={10 + i * 45} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={10 + i * 45} y1="10" x2={10 + i * 45} y2="190" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
      ))}
      {/* unity (dry) diagonal */}
      <line x1="10" y1="190" x2="190" y2="10" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 4" />
      {/* saturation response */}
      <polyline points={pts.join(" ")} fill="none" stroke="url(#msatCurve)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Plugin-faceplate hero visual: the transfer curve on a dark metal panel, control names along the bottom.
function FaceplatePanel() {
  const t = useTranslations("muedsat.about");
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#0d0d0d] p-5 shadow-2xl shadow-black/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">Transfer</span>
        <span className="h-2 w-2 rounded-full bg-[#f5a524] shadow-[0_0_10px_2px_rgba(245,165,36,0.5)]" />
      </div>
      <div className="aspect-square w-full rounded-lg border border-white/[0.06] bg-black/40 p-2">
        <SaturationCurve />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {CONTROL_KEYS.map((key) => (
          <span
            key={key}
            className="truncate rounded border border-white/[0.06] bg-white/[0.03] py-1.5 text-center font-mono text-[9px] uppercase tracking-wider text-white/45"
          >
            {t(`controls.${key}.name`)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MuedsatLandingContent() {
  const locale = useLocale();
  const th = useTranslations("muedsat.hero");
  const ta = useTranslations("muedsat.about");
  const tw = useTranslations("muedsat.whyFree");
  const tf = useTranslations("muedsat.footer");

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="flex items-baseline gap-2">
            <span className="text-lg tracking-wide">
              <span className="font-bold">MUED</span>
              <span className="font-light text-[#f5a524]">sat</span>
            </span>
            <span className="hidden text-[11px] uppercase tracking-widest text-white/30 sm:inline">
              {th("badge")}
            </span>
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="px-6 pt-16 pb-20 md:pt-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <span className="inline-block rounded-full border border-[#f5a524]/30 bg-[#f5a524]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[#f5a524]">
                {th("badge")}
              </span>
              <h1 className="mt-6 text-5xl font-extrabold tracking-tight md:text-7xl">
                <span className="text-white">MUED</span>
                <span className="text-[#f5a524]">sat</span>
              </h1>
              <p className="mt-3 text-xl font-light text-white/80 md:text-2xl">{th("tagline")}</p>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55">{th("lead")}</p>
              <div className="mt-8 max-w-md">
                <SignupForm />
              </div>
            </div>
            <div className="mx-auto w-full max-w-sm md:max-w-none">
              <FaceplatePanel />
            </div>
          </div>
        </section>

        {/* What it is + controls */}
        <section className="border-t border-white/5 px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{ta("heading")}</h2>
            <p className="mt-6 text-[15px] leading-[1.9] text-white/70">{ta("intro1")}</p>
            <p className="mt-4 text-[15px] leading-[1.9] text-white/70">{ta("intro2")}</p>

            <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
              {ta("controlsHeading")}
            </p>
            <dl className="mt-4 divide-y divide-white/5 border-y border-white/5">
              {CONTROL_KEYS.map((key) => (
                <div key={key} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
                  <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                    {ta(`controls.${key}.name`)}
                  </dt>
                  <dd className="text-[15px] leading-relaxed text-white/70">
                    {ta(`controls.${key}.desc`)}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 text-[15px] leading-[1.9] text-white/55">{ta("tech")}</p>
          </div>
        </section>

        {/* Why it's free */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{tw("heading")}</h2>
            <p className="mt-6 text-[15px] leading-[1.9] text-white/70">{tw("body1")}</p>
            <p className="mt-4 text-[15px] leading-[1.9] text-white/70">{tw("body2")}</p>
            <p className="mt-6 border-l-2 border-[#f5a524] pl-4 text-lg font-medium leading-relaxed text-white">
              {tw("emphasis")}
            </p>
            <p className="mt-6 text-sm text-white/45">{tw("body3")}</p>

            <div className="mt-10 max-w-md">
              <SignupForm />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto max-w-6xl space-y-3">
          <p className="text-sm text-white/50">{tf("operator")}</p>
          <p className="font-mono text-xs uppercase tracking-wider text-white/35">{tf("format")}</p>
          {MUEDSAT_MUEDSP_URL ? (
            <p className="text-sm text-white/45">
              {tf("muedspPrompt")}{" "}
              <a
                href={MUEDSAT_MUEDSP_URL}
                className="text-[#f5a524] underline-offset-4 transition-colors hover:underline"
              >
                {tf("muedspLink")}
              </a>
            </p>
          ) : null}
          <nav className="flex items-center gap-6 pt-2">
            <Link
              href={`/${locale}/privacy`}
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              {locale === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
