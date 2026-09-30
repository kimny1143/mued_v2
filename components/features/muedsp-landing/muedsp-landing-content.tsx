"use client";

import { BrandHeader } from "@/components/brand/brand-header";

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
import {
  MuedsatSignupForm,
  MuedsatSignupFormFallback,
} from "@/components/features/muedsat-landing/muedsat-signup-form";
import { type PluginKey } from "@/lib/plugins/registry";
import { MUEDLIM_LIVE } from "@/lib/muedlim/config";
import { MUEDRIVE_LIVE } from "@/lib/muedrive/config";
import { WINDOWS_BETA_LIVE } from "@/lib/plugins/windows-beta";
import { MasterchainBuyButton } from "@/components/features/muedsp-landing/masterchain-buy-button";
import { MasterchainTry } from "@/components/features/muedsp-landing/masterchain-try";
import {
  MASTERCHAIN_PURCHASE_LIVE,
  MASTERCHAIN_TRIAL_DAYS,
  MASTERCHAIN_TRIAL_LIVE,
} from "@/lib/masterchain/config";

const FACEPLATE_HOT = "/muedsat/faceplate-hot.webp";
const FACEPLATE_IDLE = "/muedsat/faceplate-idle.webp";
// MUEDlim faceplate — a REAL render of the shipping iPlug2 UI (a832976a LUFS-hero build), NOT a
// mock (dsp-captured, dev version-string cropped out). One clean shot, 1000×700 (= MUEDsat parity).
const FACEPLATE_MUEDLIM = "/muedlim/faceplate.webp";
const FACEPLATE_MUEDRIVE = "/muedrive/faceplate.png";
// masterchain flagship image — the REAL 1.0.1 screen (kimny: no dummies). dsp 2026-09-30: built from
// 1.0.1 source (main c5b601b2) as a capture-only standalone that opens no audio device, no key (DEMO
// badge, before the fade), audio stopped so meters read "--". Source PNG
// _mued-dsp/build/screens/masterchain-1.0.1-demo-ui.png sha256 17618b70…aa81b (2186×912) → cwebp -q 86.
// The old mock (/muedsp/masterchain-mock.webp) stays on disk but is no longer referenced.
const MASTERCHAIN_MOCK = "/muedsp/masterchain-1.0.1-demo.webp";

// MUEDsat saturation: four knobs; Bypass is a header toggle (bypassNote, not counted).
const KNOBS = ["drive", "mix", "air", "output"] as const;
// masterchain planned controls (locked spec; shown as "こうなります" — not editable on this page).
const MC_CONTROLS = ["ceiling", "width", "mono", "limiter", "bypass"] as const;
// MUEDlim (2nd free module — the peak-limiting stage): TWO knobs (INPUT + CEILING); Bypass is a
// toggle described once in bypassNote (not counted). dsp-confirmed 2-knob minimal build (e665fef5).
const MUEDLIM_KNOBS = ["input", "ceiling"] as const;
const MUEDRIVE_KNOBS = ["drive", "focus", "mix", "output"] as const;

// The form reads useSearchParams (UTM + press bypass) → needs a Suspense boundary on this
// statically-prerendered page. `plugin` selects the endpoint/copy/audience via the plugin registry.
function SignupForm({ plugin = "muedsat" as PluginKey } = {}) {
  return (
    <Suspense fallback={<MuedsatSignupFormFallback plugin={plugin} />}>
      <MuedsatSignupForm plugin={plugin} />
    </Suspense>
  );
}

export function MuedspLandingContent() {
  const locale = useLocale();
  const isJa = locale === "ja";

  const th = useTranslations("muedsp.hero");
  const tmc = useTranslations("muedsp.masterchain");
  const tt = useTranslations("muedsp.trial");
  const tf = useTranslations("muedsp.free");
  // Saturation block reuses the shipped MUEDsat copy.
  const tsHero = useTranslations("muedsat.hero");
  const tsAbout = useTranslations("muedsat.about");
  const tsWhy = useTranslations("muedsat.whyFree");
  const tsViz = useTranslations("muedsat.visuals");
  const tsFoot = useTranslations("muedsp.footer");
  // MUEDlim (peak-limiting stage) — 2nd free module. STAGED behind MUEDLIM_LIVE (hidden until the
  // 2-knob build is notarized + published at the kimny-gated flip). Now shows the shipping UI faceplate.
  const tlHero = useTranslations("muedlim.hero");
  const tlAbout = useTranslations("muedlim.about");
  const tlWhy = useTranslations("muedlim.whyFree");
  const tlViz = useTranslations("muedlim.visuals");

  // MUEDrive (third free module). ★NOT a stage lifted out of masterchain — started outside the
  // chain (content fact-lock 2026-08-28). The card must not imply "another stage".
  const tdHero = useTranslations("muedrive.hero");
  const tdAbout = useTranslations("muedrive.about");
  const tdViz = useTranslations("muedrive.visuals");
  const tw = useTranslations("muedsp.windows");

  return (
    <div className="brand-product dark min-h-screen bg-[var(--bg-base)] text-white">
      {/* Header */}
      <BrandHeader locale={locale} product="MUEDsp" />

      <main>
        {/* ── Hero — the suite entrance (text-forward; the flagship render is §1). ───────── */}
        <section className="relative overflow-hidden px-6 pt-16 pb-12">
          <div className="relative mx-auto max-w-5xl">
            <span className="inline-block border-b border-[#f5a524]/50 pb-2 font-mono text-[11px] uppercase tracking-widest text-[#f5a524]">
              {th("eyebrow")}
            </span>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight md:text-6xl">
              <span className="text-white">MUED</span>
              <span className="text-[#f5a524]">sp</span>
            </h1>
            <p className="mt-3 text-lg font-light text-white/80 md:text-xl">{th("tagline")}</p>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">
              {th("lead")}
            </p>
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
            {/* ★Buy beside the heading, always pressable (kimny 2026-10-01): a visitor from the plugin's
                "Buy masterchain" lands here and must see it without scrolling past a greyed-out button. */}
            {/* Phones: heading → Buy → text (Buy stays in the first screen). sm+: text left, Buy right. */}
            <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-[1fr_auto]">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:col-start-1 sm:row-start-1">{tmc("heading")}</h2>
              <div id="buy" className="scroll-mt-20 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:pt-1">
                {/* ★The closed label says "Coming soon"; an open button says "masterchain を購入 $69". */}
                <MasterchainBuyButton buyLabel={tmc(MASTERCHAIN_PURCHASE_LIVE ? "buyLabelLive" : "buyLabel")} />
              </div>
              <p className="text-[17px] leading-[1.8] text-white/75 sm:col-start-1 sm:row-start-2">{tmc("body")}</p>
            </div>

            {/* the flagship visual: an honest MOCK, captioned as such (not the shipping plugin) */}
            <figure className="mt-8">
              <div className="brand-display">
                <Image
                  src={MASTERCHAIN_MOCK}
                  alt={
                    isJa
                      ? "MUEDsp masterchain 1.0.1 の画面（デモ）"
                      : "The MUEDsp masterchain 1.0.1 screen (demo)"
                  }
                  width={2186}
                  height={912}
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

            {/* ★Buy + demo in one block (kimny 2026-10-01): [BUY $69] [TRY] on one row, the email for TRY below,
                then one short demo line. The FastSpring tag contract lives in lib/masterchain/fastspring-checkout.ts
                (CHECKOUT_TAG_NAMES, pinned by tests/unit/fastspring-tag-contract.test.ts). NEXT_PUBLIC_* are inlined
                at build time — check the rendered button, not just the env. */}
            <div className="mt-8 space-y-4 border-t border-white/8 pt-6">
              {!MASTERCHAIN_PURCHASE_LIVE && (
                <p className="max-w-sm text-[15px] leading-relaxed text-white/70">{tmc("priceNote")}</p>
              )}
              {MASTERCHAIN_TRIAL_LIVE && (
                <Link href={`/${locale}/muedsp/trial`} className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[#f5a524] px-5 py-3 font-semibold text-black transition-colors hover:bg-[#ffb638]">
                  {tt("cta", { days: MASTERCHAIN_TRIAL_DAYS })}
                </Link>
              )}
              <Suspense fallback={null}>
                {/* The demo stays here; the purchase is the button beside the heading. */}
                <MasterchainTry />
              </Suspense>
            </div>
            {!MASTERCHAIN_PURCHASE_LIVE && (
              <a
                href="#get"
                className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f5a524] transition-colors hover:text-[#ffc35a]"
              >
                {isJa ? "発売時に知らせる（MUEDsat の登録でお知らせにチェック） ↓" : "Get notified at launch (sign up for MUEDsat and tick the updates box) ↓"}
              </a>
            )}
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
                  {/* 3層命名: the official name is the English identifier in both locales (通称 = MUEDsat). */}
                  MUEDsp saturation
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

            {/* MUEDsp limiter (通称 MUEDlim) — the peak-limiting stage, free. Text-forward (no
                faceplate). STAGED behind MUEDLIM_LIVE: hidden until the 2-knob build is notarized +
                published at the kimny-gated flip. Two knobs (INPUT + CEILING); BYPASS is a toggle
                (bypassNote). Download form uses plugin="muedlim" (own endpoint/audience). No latency
                claim (~16ms lookahead, PDC-compensated — content fact-lock). ─────────────────────── */}
            {MUEDLIM_LIVE ? (
              <div className="mt-14 border-t border-white/5 pt-14">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                  {tf("limLabel")}
                </span>
                <h3 className="mt-3 text-3xl font-bold tracking-tight">
                  <span className="text-white">MUED</span>
                  <span className="text-[#f5a524]">lim</span>
                  <span className="ml-3 align-middle font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                    MUEDsp limiter
                  </span>
                </h3>
                <p className="mt-4 text-lg font-light text-white/80">{tlHero("tagline")}</p>
                <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{tlAbout("originLead")}</p>

                {/* the shipping UI — one clean render of the LUFS-hero limiter, meter running (real
                    iPlug2 plugin, NOT a mock). 1000×700 = MUEDsat parity; same rounded/bordered frame. */}
                <figure className="mt-8 max-w-2xl">
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30 p-1.5">
                    <Image
                      src={FACEPLATE_MUEDLIM}
                      alt={tlViz("faceplateAlt")}
                      width={1000}
                      height={700}
                      sizes="(min-width: 640px) 42rem, 88vw"
                      className="h-auto w-full rounded"
                    />
                  </div>
                </figure>

                {/* two knobs — INPUT + CEILING; BYPASS in one quiet line */}
                <p className="mt-10 text-lg font-medium leading-snug text-white/85">
                  {tlAbout("controlsLead")}
                </p>
                <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
                  {MUEDLIM_KNOBS.map((key) => (
                    <div key={key} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                      <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                        {tlAbout(`controls.${key}.name`)}
                      </dt>
                      <dd className="text-[15px] leading-relaxed text-white/70">
                        {tlAbout(`controls.${key}.desc`)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-white/45">{tlAbout("bypassNote")}</p>

                {/* the CTA for this module: the free download (email gate, plugin="muedlim") */}
                <div id="get-muedlim" className="mt-8 max-w-md scroll-mt-20">
                  <SignupForm plugin="muedlim" />
                </div>
                <p className="mt-3 max-w-md text-sm italic text-white/45">{tlHero("tryLine")}</p>
                <p className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-white/55">{tlWhy("lead")}</p>
              </div>
            ) : (
              /* MUEDlim closed to "coming soon" (2026-07-13, kimny: UI below standard). Visible
                 teaser — name + tagline + a quiet 近日/UI整備中 badge — no download form/CTA. */
              <div className="mt-14 border-t border-white/5 pt-14">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                  {tf("limLabel")}
                </span>
                <h3 className="mt-3 text-3xl font-bold tracking-tight">
                  <span className="text-white">MUED</span>
                  <span className="text-[#f5a524]">lim</span>
                  <span className="ml-3 align-middle font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                    MUEDsp limiter
                  </span>
                </h3>
                <p className="mt-4 text-lg font-light text-white/80">{tlHero("tagline")}</p>
                <p className="mt-6 inline-flex items-center rounded-[var(--radius-sm)] border border-white/12 bg-white/[0.03] px-4 py-2 font-mono text-[12px] uppercase tracking-[0.18em] text-white/50">
                  {tf("limComingSoon")}
                </p>
              </div>
            )}

            {/* ── §2-c MUEDrive ─────────────────────────────────────────────────────────────
                Third free module. ★Unlike MUEDsat/MUEDlim this one is NOT a stage taken out of
                masterchain — it was started outside the chain as a standalone plugin. That is the
                whole reason tf("driveLabel") differs in kind from satLabel/limLabel, and why the
                §2 lead was rewritten (content 2026-08-28): the old lead claimed the free set was
                "masterchain の各段" which stopped being true the moment this shipped.
                Gated on MUEDRIVE_LIVE with `&&`, NOT the ternary MUEDlim uses above. ★Do not
                "unify" them: MUEDlim was announced before it shipped, so "coming soon" is a real
                product state it passed through and the ternary has a reachable else. MUEDrive went
                straight from absent to LIVE with no announcement — it never had that state, so an
                else branch here would be dead code that can never render. The shapes differ
                because the histories differ. (product課 2026-08-28, reviewing #902.) ─────────── */}
            {MUEDRIVE_LIVE && (
              <div className="mt-14 border-t border-white/5 pt-14">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
                  {tf("driveLabel")}
                </span>
                <h3 className="mt-3 text-3xl font-bold tracking-tight">
                  <span className="text-white">MUED</span>
                  <span className="text-[#f5a524]">rive</span>
                  <span className="ml-3 align-middle font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                    MUEDsp drive
                  </span>
                </h3>
                <p className="mt-4 text-lg font-light text-white/80">{tdHero("tagline")}</p>
                <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{tdAbout("originLead")}</p>

                <figure className="mt-8 max-w-2xl">
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30 p-1.5">
                    <Image
                      src={FACEPLATE_MUEDRIVE}
                      alt={tdViz("faceplateAlt")}
                      width={1000}
                      height={700}
                      sizes="(min-width: 640px) 42rem, 88vw"
                      className="h-auto w-full rounded"
                    />
                  </div>
                </figure>

                {/* DRIVE + FOCUS carry the character; MIX and OUTPUT are the plumbing. BYPASS is a
                    toggle, so it is listed in the JSON but deliberately left out of the knob row. */}
                <p className="mt-10 text-lg font-medium leading-snug text-white/85">
                  {tdAbout("controlsLead")}
                </p>
                <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
                  {MUEDRIVE_KNOBS.map((key) => (
                    <div key={key} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                      <dt className="font-mono text-sm font-semibold uppercase tracking-wider text-[#f5a524]">
                        {tdAbout(`controls.${key}.name`)}
                      </dt>
                      <dd className="text-[15px] leading-relaxed text-white/70">
                        {tdAbout(`controls.${key}.desc`)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-white/45">
                  {tdAbout("charactersLead")}
                </p>

                <div id="get-muedrive" className="mt-8 max-w-md scroll-mt-20">
                  <SignupForm plugin="muedrive" />
                </div>
                <p className="mt-3 max-w-md text-sm italic text-white/45">{tdHero("tryLine")}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── §3 Windows. ★The 9/30 launch mail links here (`#windows`) — keep the id stable: the same
            URL becomes the beta download block from 10/1 and masterchain's later (no date on the site —
            kimny 2026-09-30), so the mail's
            link stays valid without a third send (kimny 9/29: two mails a month). ──────────────── */}
        <section id="windows" className="scroll-mt-20 border-t border-white/5 px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#f5a524]/70">
              {tw("eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">{tw("heading")}</h2>
            <p className="mt-4 text-[17px] leading-[1.8] text-white/75">{tw(WINDOWS_BETA_LIVE ? "bodyLive" : "body")}</p>
            <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
              {(["free", "masterchain"] as const).map((key) => (
                <div key={key} className="grid gap-1 py-4 sm:grid-cols-[16rem_1fr] sm:gap-5">
                  <dt className="text-[15px] font-semibold text-white/85">{tw(`${key}Label`)}</dt>
                  <dd className="text-[15px] leading-relaxed text-white/70">
                    {tw(key === "free" && WINDOWS_BETA_LIVE ? "freeStatusLive" : `${key}Status`)}
                  </dd>
                </div>
              ))}
            </dl>
            {/* ★Steps only — no zip link on this page (conductor 2026-09-30, (b)). The zips are on the
                portal, behind the same email sign-up as the Mac builds (lib/plugins/windows-beta.ts). */}
            {WINDOWS_BETA_LIVE && (
              <div data-testid="muedsp-windows-steps" className="mt-8">
                <h3 className="text-lg font-semibold text-white">{tw("stepsTitle")}</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-white/75">
                  {(tw.raw("steps") as string[]).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="mt-4 text-[14px] leading-relaxed text-white/55">{tw("note")}</p>
                <Link
                  href="/dashboard/plugins"
                  className="mt-5 inline-block text-[15px] font-semibold text-[#f5a524] hover:text-[#ffb838]"
                >
                  {tw("portalCta")} →
                </Link>
              </div>
            )}
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
