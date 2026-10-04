#!/usr/bin/env node
/**
 * Does a change touch the CUSTOMER PATH (the forms, buttons, copy and gates that turn a visitor into a
 * download or a sale)? — the trigger shared by the sales-path guards (Chief brief
 * `_chief decisions/brief-sales-path-guard-20261004.md`, kimny 2026-10-04「仕組みを作ってくれ」):
 *   G2  e2e/sales-path (Playwright, phone width): the CTA shape is pinned to the free download button
 *   G1  (next PR) a `sales-impact:` line is required in the PR body
 *
 * Usage: list of changed paths on stdin (one per line) → prints `sales=true|false` (GITHUB_OUTPUT format).
 * ★The list is the brief's G1 list. `messages/{en,ja}.json` count as a whole: the product namespaces live
 *   there, and a path-level filter cannot see which keys a diff touched — over-triggering costs one test run,
 *   under-triggering is the failure this guard exists for.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SALES_PATH_PATTERNS = [
  /^components\/features\/[^/]+-landing\//,
  /^components\/features\/license\//,
  /^lib\/plugins\/subscribe-handler\.ts$/,
  /^lib\/plugins\/audience\.ts$/,
  /^lib\/masterchain\/(demo-handler|fastspring-checkout|demo-download)\.ts$/,
  /^lib\/services\/email\.service\.ts$/,
  /^messages\/(en|ja)\.json$/,
  /^app\/\[locale\]\/(muedsat|muedlim|muedrive|muedsp|muedvox)\//,
  /^app\/layout\.tsx$/,
  /^app\/globals\.css$/,
  // ★Files that can break a CTA without touching it (CCO #1222): the middleware (a Clerk handshake turned every
  //   page into an error on this job's first run), the live flags, shared UI parts, routing/build config,
  //   dependencies and the CSS pipeline.
  /^middleware\.ts$/,
  /^proxy\.ts$/,
  /^next\.config\.(ts|js|mjs)$/,
  /^package(-lock)?\.json$/,
  /^(postcss|tailwind)\.config\.(ts|js|mjs|cjs)$/,
  /^components\/ui\//,
  /^components\/brand\//,
  /^lib\/(muedsat|muedlim|muedrive|muedsp|muedvox|masterchain)\/config\.ts$/,
  /^lib\/plugins\/(registry|windows-beta)\.ts$/,
  /^lib\/i18n\//,
  /^e2e\/sales-path\//,
  /^playwright\.sales-path\.config\.ts$/,
  /^scripts\/ci\/sales-path\.mjs$/,
  /^\.github\/workflows\/sales-path\.yml$/,
];

export function touchesSalesPath(files) {
  return files.some((f) => SALES_PATH_PATTERNS.some((re) => re.test(f)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = readFileSync(0, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  process.stdout.write(`sales=${touchesSalesPath(files)}\n`);
}
