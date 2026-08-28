/**
 * Type-check scripts/ — the 74 files that `tsconfig.json` excludes wholesale.
 *
 * ★WHY THIS EXISTS. On 2026-08-28 the funnel collector was one merge away from crashing in
 * production: `shelf()` was widened to three plugin keys while `shelfEmail` stayed at two, so
 * `shelfEmail["muedrive"]` was `undefined` and the first MUEDrive welcome email of the day would
 * have taken the whole daily report down with it. The code carried a `Record<PluginKey, …>`
 * annotation — it LOOKED type-safe. It was not: `tsconfig.json` has `exclude: ["scripts/**\/*"]`,
 * so nothing under scripts/ is ever checked. ★The annotation was decoration. (product課, PR #903.)
 *
 * ★AND THE DEBT IS SMALL. Measured, not assumed: 74 files, 14 errors, in 6 files. The other 68
 * can be protected today. `tsconfig.scripts.json` lists those 6 by name instead of hiding all 74
 * behind a glob — a glob conceals both how many files are unprotected and which ones, while a
 * list can be counted and paid down. Deleting a line from that exclude list is repayment; adding
 * one shows up in a PR diff.
 *
 * ★SELF-RED. A check that only ever reports "clean" is indistinguishable from a check whose
 * `include`/`exclude` is misconfigured to match nothing — both are silent and green. So this
 * script does not just run tsc: it first plants a file with a known type error, asserts tsc FAILS
 * on it, removes it, and only then reports the real result. A hand-run RED is not enough; nobody
 * re-runs it on the day the config changes, which is exactly the day it matters.
 *
 * Exit codes: 0 = clean · 1 = real type errors · 2 = ★the check itself could not be trusted.
 * ★2 is not "no errors found" — it means the measurement is void. Never read it as green.
 */
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

const PROJECT = "tsconfig.scripts.json";
const PROBE = "scripts/__typecheck_self_red.ts";

/** Run tsc on the project. Returns the exit code and combined output (tsc writes errors to stdout). */
function tsc(): { code: number; out: string } {
  try {
    const out = execFileSync("npx", ["tsc", "-p", PROJECT, "--noEmit"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(2);
}

if (!existsSync(PROJECT)) fail(`${PROJECT} not found — the check cannot run.`);
if (existsSync(PROBE)) fail(`${PROBE} already exists — a previous run left it behind. Remove it and re-run.`);

// ── 1) SELF-RED: prove the check can still see a file under scripts/ before trusting its verdict.
writeFileSync(
  PROBE,
  "// Temporary self-RED probe written by scripts/verify/typecheck-scripts.ts. Safe to delete.\n" +
    "const n: number = \"deliberately a string\";\nexport default n;\n",
  "utf8",
);
let red: { code: number; out: string };
try {
  red = tsc();
} finally {
  if (existsSync(PROBE)) unlinkSync(PROBE);
}
if (red.code === 0 || !red.out.includes("__typecheck_self_red")) {
  fail(
    "SELF-RED FAILED — tsc did not report the planted error in scripts/.\n" +
      `  This check is NOT measuring scripts/. Do not read its green as safety.\n` +
      `  Most likely ${PROJECT} include/exclude no longer matches scripts/.\n` +
      (red.out ? `  tsc said:\n${red.out.split("\n").slice(0, 8).map((l) => `    ${l}`).join("\n")}\n` : ""),
  );
}
console.log("✓ self-RED: tsc detected a planted error under scripts/ — the check is measuring.");

// ── 2) The real run.
const real = tsc();
if (real.code === 0) {
  console.log("✓ scripts/ type-check clean (excluded debt is listed by name in tsconfig.scripts.json).");
  process.exit(0);
}
const errors = real.out.split("\n").filter((l) => l.includes("error TS"));
console.error(`✗ scripts/ type-check: ${errors.length} error(s)\n`);
console.error(real.out.trim());
console.error(
  "\n★If this file is known-broken debt, add it BY NAME to the exclude list in " +
    `${PROJECT} — do not widen the glob, and do not delete this check.`,
);
process.exit(1);
