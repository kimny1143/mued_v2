"use client";

// MUEDsat free-download LP — dark, pro-audio faceplate aesthetic (not the advisory light editorial
// theme). Dark metallic + amber (glasswerks --amber #f5a524). All copy comes from the `muedsat.*` i18n
// namespace (messages/{en,ja}.json) — no hardcoded copy. Staged behind MUEDSAT_LIVE (page.tsx robots).
//
// Structure = content §A canonical (muedsat-dl-page-chunked-copy-20260709, PR #351): each block is a
// short lead (10-second read, visible) + one dedicated visual + the full approved copy folded away.
// Visuals = the real 案D plugin render (pixel-verified, kimny-approved; source of truth =
// _conductor/designsystem/muedsat-ui/muedsat-D-layout-{hot,idle}.png), exact pixels, not redrawn: the
// plugin's own UI IS the diagram (Softube-type "one real UI image" hero + control crops as figures).
// Assets: public/muedsat/*.webp.
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
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

const FACEPLATE_HOT = "/muedsat/faceplate-hot.webp";
const FACEPLATE_IDLE = "/muedsat/faceplate-idle.webp";
const CROP_DRIVE = "/muedsat/crop-drive.webp";
const CROP_METER = "/muedsat/crop-meter.webp";
const CROP_KNOBS = "/muedsat/crop-knobs.webp";

const ALL_CONTROLS = ["drive", "mix", "air", "output", "bypass"] as const;

export function MuedsatLandingContent() {
  const locale = useLocale();
  const isJa = locale === "ja";
  const th = useTranslations("muedsat.hero");
  const ta = useTranslations("muedsat.about");
  const tw = useTranslations("muedsat.whyFree");
  const tf = useTranslations("muedsat.footer");
  const tv = useTranslations("muedsat.visuals");
  const tm = useTranslations("muedsat.masterchain");

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
        {/* Block 0 — Hero: real plugin faceplate (hot / glowing), one image, in the fold */}
        <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/4 h-[560px] w-[560px] translate-x-1/3 rounded-full bg-[#ff5a1f]/[0.07] blur-[120px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <span className="inline-block rounded-full border border-[#f5a524]/30 bg-[#f5a524]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[#f5a524]">
                {th("badge")}
              </span>
              <h1 className="mt-6 text-5xl font-extrabold tracking-tight md:text-7xl">
                <span className="text-white">MUED</span>
                <span className="text-[#f5a524]">sat</span>
              </h1>
              {/* Formal name (Chief usage table: DL page = formal "MUEDsp saturation"; the wordmark
                  stays the nickname brand mark). */}
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-white/40">MUEDsp saturation</p>
              <p className="mt-3 text-xl font-light text-white/80 md:text-2xl">{th("tagline")}</p>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55">{th("lead")}</p>
              <div className="mt-8 max-w-md">
                <SignupForm />
              </div>
              {/* Optional light line (content §A Block 0; kimny 現物 decides keep/drop) */}
              <p className="mt-4 max-w-md text-sm italic text-white/45">{th("tryLine")}</p>
            </div>
            <div className="mx-auto w-full max-w-xl md:max-w-none">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 shadow-2xl shadow-black/50">
                <Image
                  src={FACEPLATE_HOT}
                  alt={tv("faceplateAlt")}
                  width={1000}
                  height={700}
                  priority
                  sizes="(min-width: 768px) 480px, 90vw"
                  className="h-auto w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Block 1 — What it is: short lead + the plugin reacting (idle vs driven), full origin folded */}
        <section className="border-t border-white/5 px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{ta("heading")}</h2>
            <p className="mt-6 text-lg leading-[1.8] text-white/80 md:text-xl">{ta("originLead")}</p>
            <details className="group mt-5">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white/70">
                {isJa ? "詳しく" : "Read more"}
                <span className="text-white/30 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-4 text-[15px] leading-[1.9] text-white/65">{ta("intro1")}</p>
            </details>
          </div>

          {/* idle ↔ driven compare — the same UI, before/after the sound hits it */}
          <figure className="mx-auto mt-12 max-w-4xl">
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2">
                  <Image
                    src={FACEPLATE_IDLE}
                    alt={tv("compareAlt")}
                    width={1000}
                    height={700}
                    sizes="(min-width: 640px) 45vw, 90vw"
                    className="h-auto w-full rounded-lg"
                  />
                </div>
                <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
                  {tv("idleLabel")}
                </p>
              </div>
              <div>
                <div className="overflow-hidden rounded-xl border border-[#ff5a1f]/25 bg-black/30 p-2 shadow-[0_0_40px_-12px_rgba(255,90,31,0.4)]">
                  <Image
                    src={FACEPLATE_HOT}
                    alt=""
                    aria-hidden="true"
                    width={1000}
                    height={700}
                    sizes="(min-width: 640px) 45vw, 90vw"
                    className="h-auto w-full rounded-lg"
                  />
                </div>
                <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#f5a524]/70">
                  {tv("hotLabel")}
                </p>
              </div>
            </div>
          </figure>
        </section>

        {/* Block 2 — What it does to the sound: the signature living transfer curve */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-20">
          <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-14">
            <div className="order-2 md:order-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
                {tv("signatureHeading")}
              </p>
              <p className="mt-4 text-lg leading-[1.8] text-white/80 md:text-xl">{ta("intro2")}</p>
            </div>
            <div className="order-1 md:order-2">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2">
                <Image
                  src={CROP_METER}
                  alt={tv("meterAlt")}
                  width={555}
                  height={335}
                  sizes="(min-width: 768px) 40vw, 90vw"
                  className="h-auto w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Block 3 — Controls: five, nothing hidden. The real knobs as the figure, specifics folded */}
        <section className="border-t border-white/5 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-lg font-medium leading-snug text-white/85 md:text-xl">{ta("controlsLead")}</p>

            <div className="mt-8 grid items-center gap-8 md:grid-cols-2 md:gap-14">
              <div className="mx-auto w-full max-w-[240px] md:mx-0 md:justify-self-center">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2">
                  <Image
                    src={CROP_DRIVE}
                    alt={tv("driveAlt")}
                    width={375}
                    height={400}
                    sizes="(min-width: 768px) 240px, 65vw"
                    className="h-auto w-full rounded-lg"
                  />
                </div>
              </div>
              <div>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2">
                  <Image
                    src={CROP_KNOBS}
                    alt={tv("knobsAlt")}
                    width={480}
                    height={160}
                    sizes="(min-width: 768px) 40vw, 90vw"
                    className="h-auto w-full rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Full honest list of every control, plus the technical line — folded */}
            <details className="group mt-10 rounded-lg border border-white/8 bg-white/[0.02] px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-white/70">
                {isJa ? "5つのコントロールの詳細" : "All five controls, in detail"}
                <span className="text-white/30 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <dl className="mt-4 divide-y divide-white/5 border-y border-white/5">
                {ALL_CONTROLS.map((key) => (
                  <div key={key} className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-5">
                    <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                      {ta(`controls.${key}.name`)}
                    </dt>
                    <dd className="text-[15px] leading-relaxed text-white/70">
                      {ta(`controls.${key}.desc`)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-[15px] leading-[1.9] text-white/55">{ta("tech")}</p>
              <p className="mt-4 font-mono text-xs uppercase tracking-wider text-white/35">{tf("format")}</p>
            </details>
          </div>
        </section>

        {/* Block 4 — Why it's free: the price-of-download point up front, the two reasons folded */}
        <section className="border-t border-white/5 bg-white/[0.015] px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{tw("heading")}</h2>
            <p className="mt-6 text-lg leading-[1.8] text-white/80 md:text-xl">{tw("lead")}</p>
            <details className="group mt-5">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white/70">
                {isJa ? "メールについて" : "About the email"}
                <span className="text-white/30 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-4 text-[15px] leading-[1.9] text-white/65">{tw("body2")}</p>
              <p className="mt-3 text-sm text-white/45">{tw("body3")}</p>
            </details>

            <div className="mt-10 max-w-md">
              <SignupForm />
            </div>
          </div>
        </section>

        {/* Block 5 — MUEDsp masterchain: the finished form, in development. A quiet heads-up, not a store. */}
        <section className="border-t border-white/5 px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-xl border border-white/8 bg-gradient-to-b from-white/[0.03] to-transparent p-6 md:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                {tm("eyebrow")}
              </p>
              <p className="mt-3 text-lg leading-[1.7] text-white/70 md:text-xl">{tm("body")}</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto max-w-6xl space-y-3">
          <p className="text-sm text-white/50">{tf("operator")}</p>
          <p className="font-mono text-xs uppercase tracking-wider text-white/35">{tf("format")}</p>
          <nav className="flex items-center gap-6 pt-2">
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
