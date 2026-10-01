"use client";

import { WINDOWS_BETA_LIVE } from "@/lib/plugins/windows-beta";
import { BrandHeader } from "@/components/brand/brand-header";

// MUEDrive standalone free-download LP (/[locale]/muedrive) — third module in the MUEDsp free family.
// Mirrors components/features/muedlim-landing (same dark pro-audio chrome, shared plugin signup form,
// shipped-UI faceplate, muedrive.* i18n namespace). Fact-lock (MUEDrive canon): saturator with THREE
// characters (tube / warm / console) on a 3-position CHARACTER selector, DRIVE + FOCUS + MIX + OUTPUT
// + true BYPASS, THREE formats (VST3 · AU · AAX), macOS Universal, fully free.
// ★NOT a stage lifted out of MUEDsp masterchain — started outside the chain as a standalone plugin
//   (kimny 2026-08-22). The origin paragraph in the copy says so; do not "simplify" it back.
// ★latency is NOT described anywhere (the real figure is non-zero; the old "5 samples" line was wrong).
// Staged behind MUEDRIVE_LIVE (page.tsx robots). No hardcoded copy.
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  MuedsatSignupForm,
  MuedsatSignupFormFallback,
} from "@/components/features/muedsat-landing/muedsat-signup-form";

// The form reads useSearchParams (UTM + press bypass) → needs a Suspense boundary on this statically
// prerendered page. plugin="muedrive" selects the MUEDrive endpoint/copy/audience via the registry.
function SignupForm() {
  return (
    <Suspense fallback={<MuedsatSignupFormFallback plugin="muedrive" />}>
      <MuedsatSignupForm plugin="muedrive" />
    </Suspense>
  );
}

// Real render of the shipped iPlug2 UI, 1000×700 (mued-dsp docs/img/muedrive_faceplate_20260827.png,
// house-wordmark rebuild, kimny 意匠 gate 合格・2026-08-27). Not a mock.
// ★Provenance of the look (CCO 2026-08-27): the FORM follows the shipped MUEDsat/MUEDlim house.
//   The COLOUR PAIR of the wordmark is a NEW choice made for this build, not inherited — MUEDlim
//   sets its tail 0xf2→0xc2 (Δ48) where MUEDrive sets 0xfa→0x56 (Δ164). Not a violation (the house
//   spec leaves latitude and kimny passed the render), but do not cite MUEDrive as precedent for
//   the pair without saying it was chosen here.
const FACEPLATE = "/muedrive/faceplate.png";

// Two knobs; Bypass is a header toggle described once in bypassNote (the page matches the knob count).
// Four knobs + a true BYPASS. CHARACTER is a 3-position selector, described in its own section.
const KNOBS = ["drive", "focus", "mix", "output", "bypass"] as const;
const CHARACTERS = ["tube", "warm", "console"] as const;

export function MuedriveLandingContent() {
  const locale = useLocale();
  const isJa = locale === "ja";
  const th = useTranslations("muedrive.hero");
  const ta = useTranslations("muedrive.about");
  const tw = useTranslations("muedrive.whyFree");
  const tf = useTranslations("muedrive.footer");
  const twin = useTranslations("muedsp.windows");
  const tv = useTranslations("muedrive.visuals");

  return (
    <div className="brand-product dark min-h-screen bg-[var(--bg-base)] text-white">
      {/* Header */}
      <BrandHeader locale={locale} product="MUEDrive" />

      <main>
        {/* Hero — the real plugin, one image, and the only download form */}
        <section className="relative overflow-hidden px-6 pt-14 pb-16">
          <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <span className="inline-block border-b border-[#f5a524]/50 pb-2 font-mono text-[11px] uppercase tracking-widest text-[#f5a524]">
                {th("badge")}
                {/* ★Windows only while the beta is live (lib/plugins/windows-beta.ts) — otherwise not a character changes. */}
                {WINDOWS_BETA_LIVE && <> · {twin("productBadge")}</>}
              </span>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight md:text-6xl">
                <span className="text-white">MUED</span>
                <span className="text-[#f5a524]">rive</span>
              </h1>
              {/* Formal name (3-layer naming: DL page shows the formal "MUEDsp drive"). */}
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-white/40">MUEDsp drive</p>
              <p className="mt-3 text-lg font-light text-white/80 md:text-xl">{th("tagline")}</p>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">{th("lead")}</p>
              <div id="get" className="mt-7 max-w-md scroll-mt-20">
                <SignupForm />
              </div>
              <p className="mt-3 max-w-md text-sm italic text-white/45">{th("tryLine")}</p>
            </div>
            <div className="mx-auto w-full max-w-md md:max-w-none">
              <div className="brand-display">
                <Image
                  src={FACEPLATE}
                  alt={tv("faceplateAlt")}
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

        {/* What it is — one short paragraph (provenance: pulled from the masterchain, made free). */}
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">{ta("heading")}</h2>
            <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{ta("originLead")}</p>
          </div>
        </section>

        {/* Three characters — the selector, not a knob. Same dl/dt/dd shape as the knob list. */}
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">{ta("charactersHeading")}</h2>
            <p className="mt-4 text-[17px] leading-[1.8] text-white/75">{ta("charactersLead")}</p>
            <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
              {CHARACTERS.map((key) => (
                <div key={key} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                  <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                    {ta(`characters.${key}.name`)}
                  </dt>
                  <dd className="text-[15px] leading-relaxed text-white/70">
                    {ta(`characters.${key}.desc`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Controls — DRIVE + FOCUS + MIX + OUTPUT and a true BYPASS. CHARACTER is the selector above. */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <p className="text-lg font-medium leading-snug text-white/85">{ta("controlsLead")}</p>
            <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
              {KNOBS.map((key) => (
                <div key={key} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                  <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                    {ta(`controls.${key}.name`)}
                  </dt>
                  <dd className="text-[15px] leading-relaxed text-white/70">
                    {ta(`controls.${key}.desc`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Why it's free — one condensed paragraph, then a text link back to the hero form. No second form. */}
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">{tw("heading")}</h2>
            <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{tw("lead")}</p>
            <a
              href="#get"
              className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]"
            >
              {isJa ? "無料でダウンロード ↑" : "Download it free ↑"}
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-2.5">
          <p className="text-sm text-white/50">{tf("operator")}</p>
          <p className="font-mono text-xs uppercase tracking-wider text-white/35">{tf("format")}</p>
          {WINDOWS_BETA_LIVE && <p className="font-mono text-xs uppercase tracking-wider text-white/35">{twin("productFormat")}</p>}
          <nav className="flex items-center gap-6 pt-1">
            <Link
              href={`/${locale}/privacy`}
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              {isJa ? "プライバシーポリシー" : "Privacy Policy"}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
