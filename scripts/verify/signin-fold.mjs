#!/usr/bin/env node
/**
 * /sign-in fold check — are the two elements a visitor needs still on screen without scrolling?
 *
 * ## Why this exists
 *
 * PR #757 added two explanatory lines to the /sign-in door. The diff looked harmless. It pushed the
 * Clerk card's Continue button BELOW THE FOLD at 375x667 — the copy block had grown to 209px, 31% of
 * the viewport. Nothing in `tsc`, `eslint`, `next build` or a code review can see that: the failure
 * only exists as a rendered geometry, so it has to be measured as one.
 *
 * ## What is a gate here, and what is only a diagnostic
 *
 * GATE (exits non-zero):
 *   - the social buttons' bottom edge is within the viewport
 *   - the identifier input's bottom edge is within the viewport
 * Those two are "can the visitor tell what to do?". For the ~311 plugin owners who have no Clerk
 * account yet, the social buttons ARE the action.
 *
 * DIAGNOSTIC (printed, never fails the run):
 *   - the Continue button's position, and the copy block's height / viewport ratio
 * Continue is the step AFTER the visitor knows what to do, and it stays reachable when off-screen:
 * focusing the input scrolls to it, and Enter submits (measured — the button is a real submit inside
 * the same <form> as the input). The copy ratio is an early warning while writing, not a pass/fail —
 * a ratio target would be a proxy, and 20% can fail while 25% passes, because the card's own height
 * moves with the number of social providers, the divider and Clerk's padding.
 *
 * ## ★ This does NOT run in CI
 *
 * It needs a real browser, and the E2E lane does not run in CI. This is a ONE-COMMAND MANUAL CHECK,
 * not a gate the pipeline enforces. If you are editing the copy on /sign-in, you have to run it.
 * Nothing else will.
 *
 * ## ★ Measure prod, not localhost
 *
 * The local/preview Clerk instance is a DIFFERENT instance from prod: it renders ONE social button
 * (Google) where prod renders TWO (Apple + Google) — roughly 40px more card. Measuring locally
 * therefore UNDER-estimates the real layout and can pass while prod fails. The URL argument is
 * required for exactly this reason; prod is the default target.
 *
 * Usage:
 *   node scripts/verify/signin-fold.mjs                        # defaults to https://mued.jp/sign-in
 *   node scripts/verify/signin-fold.mjs http://localhost:3000/sign-in   # dev instance — see caveat above
 */
import { chromium } from "playwright";

const DEFAULT_URL = "https://mued.jp/sign-in";
const url = process.argv[2] ?? DEFAULT_URL;

// 375x667 is the smallest phone still in common use and the tightest case; 390x844 is the modern median.
const VIEWPORTS = [
  { w: 375, h: 667, label: "375x667 (iPhone SE)" },
  { w: 390, h: 844, label: "390x844 (iPhone 14)" },
];

const isLocal = /localhost|127\.0\.0\.1/.test(url);

console.log(`\n/sign-in fold check → ${url}`);
if (isLocal) {
  console.log(
    "⚠  LOCAL TARGET: this is the dev Clerk instance (1 social button). Prod renders 2 (~40px taller),\n" +
      "   so a pass here does NOT imply a pass on prod. Re-run against https://mued.jp/sign-in before trusting it.",
  );
}

const browser = await chromium.launch();
let failed = false;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500); // Clerk hydrates the card client-side

  const m = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    };
    return {
      copy: rect("p.mb-4.max-w-md"),
      social: rect(".cl-socialButtonsRoot"),
      identifier: rect("input[name=identifier]"),
      continue: rect(".cl-formButtonPrimary"),
      socialButtonCount: document.querySelectorAll(".cl-socialButtonsBlockButton").length,
    };
  });

  console.log(`\n===== ${vp.label} =====`);
  console.log(`  social buttons rendered: ${m.socialButtonCount}`);

  // --- GATE ---
  for (const [label, r] of [
    ["social buttons", m.social],
    ["identifier input", m.identifier],
  ]) {
    if (!r) {
      console.log(`  ✗ GATE  ${label.padEnd(18)} NOT FOUND — selector broke, or the card did not render`);
      failed = true;
      continue;
    }
    const ok = r.bottom <= vp.h;
    if (!ok) failed = true;
    console.log(
      `  ${ok ? "✓" : "✗"} GATE  ${label.padEnd(18)} bottom=${String(r.bottom).padStart(4)} / viewport=${vp.h}` +
        `${ok ? "" : "   ★BELOW THE FOLD"}`,
    );
  }

  // --- DIAGNOSTICS (never fail) ---
  if (m.continue) {
    const inView = m.continue.bottom <= vp.h;
    console.log(
      `    diag  continue           top=${String(m.continue.top).padStart(4)} bottom=${String(m.continue.bottom).padStart(4)}` +
        `  ${inView ? "in view" : "below fold (OK — Enter submits, focus scrolls)"}`,
    );
  }
  if (m.copy) {
    const pct = Math.round((m.copy.height / vp.h) * 100);
    console.log(`    diag  copy block         height=${m.copy.height}px = ${pct}% of viewport`);
  }

  await page.close();
}

await browser.close();

console.log(
  failed
    ? "\n✗ FAIL — an element the visitor needs is off-screen. Shorten the copy block on /sign-in.\n"
    : "\n✓ PASS — social buttons and identifier input are both within the fold.\n",
);
process.exit(failed ? 1 : 0);
