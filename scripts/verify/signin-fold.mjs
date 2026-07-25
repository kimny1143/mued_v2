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

// ★ 667 and 844 are SCREEN heights, not browser viewport heights. Safari's chrome eats ~108px, and the
// cohort this page is for arrives in a mail-app webview, which is the same or worse. 375x559 is the
// honest worst case and is included as a gate — measuring only the screen height flatters the layout.
const VIEWPORTS = [
  { w: 375, h: 559, label: "375x559 (iPhone SE, Safari viewport)" },
  { w: 375, h: 667, label: "375x667 (iPhone SE, full screen)" },
  { w: 390, h: 844, label: "390x844 (iPhone 14, full screen)" },
];

const isLocal = /localhost|127\.0\.0\.1/.test(url);

console.log(`\n/sign-in fold check → ${url}`);
if (isLocal) {
  console.log(
    "⚠  LOCAL TARGET: this is the dev Clerk instance (1 social button). Prod renders 2 (~40px taller),\n" +
      "   so a pass here does NOT imply a pass on prod. Re-run against https://mued.jp/sign-in before trusting it.",
  );
}

// ★ Use the REAL Chrome that is installed, not Playwright's bundled headless Chromium. product課
// measured the same prod page in real Chrome and got the identifier input 53px LOWER than this script
// originally reported — enough to move it from "34px of room" to "19px past the fold". Part of that was
// webfonts (see fonts.ready below); the rest is attributable to headless Chromium's font fallback and
// text metrics. Visitors use Chrome and Safari, so "position in headless Chromium" is itself a proxy
// for "position in the user's browser" — the same substitution this whole file exists to avoid.
let browser;
let engineLabel;
try {
  browser = await chromium.launch({ channel: "chrome" });
  engineLabel = "real Chrome (channel: chrome)";
} catch {
  browser = await chromium.launch();
  engineLabel =
    "★bundled headless Chromium — Chrome not found. Numbers run OPTIMISTIC (measured ~53px on prod); treat a PASS as unconfirmed.";
}
console.log(`engine: ${engineLabel}`);

let failed = false;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".cl-card", { timeout: 15000 }).catch(() => {});
  // ★ Wait for webfonts. Measuring before they apply understates the layout: the same page measured
  // before/after fonts.ready moved every element down ~30px (the mobile logo block grows 98→128px).
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    };
    const copyEl = document.querySelector("p.mb-4.max-w-md");
    return {
      copy: rect("p.mb-4.max-w-md"),
      social: rect(".cl-socialButtonsRoot"),
      // /sign-in labels it `identifier`; /sign-up (since email became Required) uses `emailAddress`.
      identifier: rect("input[name=identifier]") ?? rect("input[name=emailAddress]"),
      continue: rect(".cl-formButtonPrimary"),
      socialButtonCount: document.querySelectorAll(".cl-socialButtonsBlockButton").length,
      // Diagnostics that make two people's measurements comparable instead of just different.
      fontsStatus: document.fonts.status,
      // Rendered line count = height / line-height. NOT getClientRects().length — a block-level <p>
      // returns exactly 1 rect no matter how many times its text wraps, so that would silently report
      // "1 line" for a 9-line paragraph. (Caught while comparing two people's diagnostics.)
      copyLines: copyEl
        ? Math.round(copyEl.getBoundingClientRect().height / parseFloat(getComputedStyle(copyEl).lineHeight))
        : null,
      copyFont: copyEl ? getComputedStyle(copyEl).fontFamily.split(",")[0] : null,
      logoBlock: rect("div.lg\\:hidden.mb-8"),
      dpr: window.devicePixelRatio,
      innerWidth: window.innerWidth,
    };
  });

  console.log(`\n===== ${vp.label} =====`);
  console.log(
    `  social=${m.socialButtonCount}  fonts=${m.fontsStatus}  dpr=${m.dpr}  innerWidth=${m.innerWidth}` +
      `  copyLines=${m.copyLines}  font=${m.copyFont}`,
  );

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
  if (m.logoBlock) {
    // ★ If you need vertical room, take it from here first. This block is the word "MUED" under a
    // logo — decoration. The copy above the card is information (it stops the door from misleading
    // people who have no account). Shrink the decoration before you shorten the message.
    console.log(`    diag  mobile logo block  height=${m.logoBlock.height}px (decoration — cut this first)`);
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
