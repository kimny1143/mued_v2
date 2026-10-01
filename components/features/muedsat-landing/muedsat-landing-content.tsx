"use client";

import { WINDOWS_BETA_LIVE } from "@/lib/plugins/windows-beta";
import { BrandHeader } from "@/components/brand/brand-header";

// MUEDsat free-download LP — dark, pro-audio faceplate aesthetic (not the advisory light editorial
// theme). Dark metallic + amber (glasswerks --amber #f5a524). All copy comes from the `muedsat.*` i18n
// namespace (messages/{en,ja}.json) — no hardcoded copy. Staged behind MUEDSAT_LIVE (page.tsx robots).
//
// v2 (kimny 現物 7/9): concise + dense — a small honest plugin's page, not a big-product-page.
// content §A v2 canonical (muedsat-dl-copy-v2-20260709): copy is condensed and shown plainly (no
// disclosure folds — short text + whitespace reads more premium/Valhalla-quiet). Two visuals only: the
// real 案D faceplate (hero) and one idle↔hot compare that carries the transfer-curve story. Four knobs
// (Bypass is a header toggle, mentioned once, not counted). Single primary CTA in the hero; the bottom
// is a text link back to it. Visuals are exact pixels from the pixel-verified spec v2
// (_conductor/designsystem/muedsat-ui/muedsat-D-layout-{hot,idle}.png), not redrawn.
// Assets: public/muedsat/faceplate-{hot,idle}.webp.
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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

const FACEPLATE_HOT = "/muedsat/faceplate-1.0.1-drive85.webp";
const FACEPLATE_IDLE = "/muedsat/faceplate-1.0.1-drive30.webp";

// Four knobs; Bypass is a header toggle, described in bypassNote (kimny 現物: the page must match the
// knob count you can see).
const KNOBS = ["drive", "mix", "air", "output"] as const;

export function MuedsatLandingContent() {
  const locale = useLocale();
  const isJa = locale === "ja";
  const th = useTranslations("muedsat.hero");
  const ta = useTranslations("muedsat.about");
  const tw = useTranslations("muedsat.whyFree");
  const tf = useTranslations("muedsat.footer");
  const twin = useTranslations("muedsp.windows");
  const tv = useTranslations("muedsat.visuals");
  const tm = useTranslations("muedsat.masterchain");

  return (
    <div className="brand-product dark min-h-screen bg-[var(--bg-base)] text-white">
      {/* Header */}
      <BrandHeader locale={locale} product="MUEDsat" />

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
                <span className="text-[#f5a524]">sat</span>
              </h1>
              {/* Formal name (Chief usage table: DL page = formal "MUEDsp saturation"). */}
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-white/40">MUEDsp saturation</p>
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
                  src={FACEPLATE_HOT}
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

        {/* What it is / does — one short paragraph + one visual: the same UI idle vs driven */}
        <section className="border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">{ta("heading")}</h2>
            <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{ta("originLead")}</p>

            <figure className="mt-8">
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30 p-1.5">
                    <Image
                      src={FACEPLATE_IDLE}
                      alt={tv("compareAlt")}
                      width={1000}
                      height={700}
                      sizes="(min-width: 640px) 40vw, 88vw"
                      className="h-auto w-full rounded"
                    />
                  </div>
                  <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                    {tv("idleLabel")}
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
                    {tv("hotLabel")}
                  </p>
                </div>
              </div>
            </figure>
          </div>
        </section>

        {/* Controls — four knobs, nothing hidden. Shown plainly; Bypass + tech in one quiet line. */}
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
            <p className="mt-5 text-sm leading-relaxed text-white/45">{ta("bypassNote")}</p>
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

        {/* MUEDsp masterchain — the finished form, in development. A quiet heads-up, not a store. */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-12">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-xl border border-white/8 bg-gradient-to-b from-white/[0.03] to-transparent p-5 md:p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                {tm("eyebrow")}
              </p>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-white/70 md:text-base">{tm("body")}</p>
            </div>
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
