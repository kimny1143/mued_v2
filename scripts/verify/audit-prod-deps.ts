#!/usr/bin/env tsx
/**
 * Production-dependency security audit — with the two failure modes told apart.
 *
 * `npm audit --omit=dev --audit-level=high` exits 1 for TWO unrelated reasons:
 *   (A) high/critical vulnerabilities found  → the gate working. BLOCK.
 *   (B) the audit API is unreachable         → we learned NOTHING about our dependencies.
 *
 * CI could not distinguish them: same red, same exit code. On 2026-07-26 npm's audit API failed on
 * BOTH endpoints at once (v10 `/audits/quick` → HTTP 400 "This endpoint is being retired"; v11
 * `/advisories/bulk` → undecoded gzip, "Unexpected token '^_'"), which no override or npm upgrade
 * could fix because no advisory was involved. Every PR in this repo was blocked by an outage.
 *
 * ★This does NOT relax the gate. (A) blocks exactly as before. What changes is that (B) stops
 * masquerading as (A) — and says so loudly instead of going quietly green.
 *
 * The decision itself lives in lib/ci/audit-verdict.ts so the BLOCKING path is unit-tested; it
 * cannot be exercised through the CLI while the registry is down, and an untested blocking path is
 * not a gate. Discrimination is structural (does the payload contain a vulnerabilities report?), not
 * a match on the message text — that would be a proxy for the outcome.
 *
 * ★SCOPE, stated plainly: this bypass is NOT limited to the 2026-07-26 outage. ANY reason npm fails
 * to return a readable report — proxy, offline runner, npm missing, a future schema change — lands
 * in the same branch and goes green with a warning. That is bounded by BYPASS_UNTIL, not by cause.
 * (It does still block if the unreadable payload names a high/critical finding — see auditVerdict.)
 *
 * ★WHAT THIS GATE STRUCTURALLY CANNOT SAY (CCO review of #986, 2026-09-10). It reads the RESOLVED
 * tree, so it tells you a vulnerable version came back — never why it must not. After #986 the fix
 * lived only in package-lock.json: the declared ranges still ADMITTED the vulnerable versions
 * (`^0.35.0` admits sharp 0.35.3; `^3.15.1` admits js-yaml 3.15.1 — the vulnerable range's top edge).
 * The declared floors, and the advisory each one answers, are asserted offline in
 * ★tests/unit/dependency-security-floors.test.ts — which still runs when the registry is down, the
 * outage this file exists for.
 *
 * Usage:  npx tsx scripts/verify/audit-prod-deps.ts
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { auditVerdict, bypassExpired, mayRefetch } from "@/lib/ci/audit-verdict";
import { AUDIT_ALLOWLIST } from "@/lib/ci/audit-allowlist";

// ★ Delete this script and restore a plain `npm audit` once the registry is healthy.
//   Extending this date must be a deliberate decision by whoever hits the failure — that is the point.
const BYPASS_UNTIL = "2026-08-09";

function summary(text: string): void {
  // Rendered on the GitHub run page. A ::warning:: annotation alone scrolls out of the log.
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  try {
    appendFileSync(path, text + "\n");
  } catch {
    /* best-effort — never let the summary change the verdict */
  }
}

/**
 * ★RETRY THE TRANSPORT, NEVER THE VERDICT.
 *
 * ★Measured 2026-09-05 (probe run 33936366071, on the CI runner): `npm audit` DOES work from CI and
 * returns the same numbers as a local run — `{low: 6, moderate: 8, high: 0, critical: 0}`. It simply
 * fails to answer some of the time. Of the CI failures in the preceding 20 runs, every one was this
 * step. ★So the defect is "sometimes cannot ask", not "answers wrongly", and the earlier reading
 * (`HTTP 400 … endpoint is being retired` ⇒ the endpoint is gone) was one observed failure message
 * mistaken for a permanent state — 400 and 503 are two faces of the same intermittency.
 *
 * ★THE LINE THAT MATTERS, because this repo forbids retrying a non-deterministic gate until it
 * passes: that rule is about re-drawing a VERDICT. This loop re-draws only the FETCH.
 *
 *     "could we ask?"    → transport. Flaky, and retrying changes nothing about the answer.
 *     "what did it say?" → verdict. Asking again inside this window returns the same.
 *
 * ★PRECISION, because the budget is the load-bearing part: the answer is a function of
 * package-lock.json AND the advisory database. The lockfile cannot move mid-run, and the advisory DB
 * is effectively frozen across 90 seconds — so "asking again cannot change it" is true HERE, and true
 * BECAUSE the window is short. ★Anyone widening RETRY_BUDGET_MS to hours breaks that premise before
 * they break anything else: over hours a new advisory can land, and the loop would then be re-asking
 * a question whose answer genuinely changed. ★The bound is not a performance knob. (product課, #979.)
 *
 * ★So the loop exits the instant a verdict EXISTS — `clean` and `vulnerable` both break immediately.
 * ★A `vulnerable` result is never re-asked. Only `not-performed` (no answer at all) is retried, and
 * the gate is not loosened by one millimetre: a real "could not ask" still falls through to the same
 * hard failure it does today, and BYPASS_UNTIL is untouched.
 *
 * ★The ceiling is ELAPSED TIME, not attempt count (CCO #489): when npm is fast, a count-based cap
 * stops bounding the thing that actually matters, which is how long CI waits.
 */
const RETRY_BUDGET_MS = 90_000;
const RETRY_PAUSE_MS = 5_000;

function sleepSync(ms: number): void {
  // The script is synchronous end-to-end; a sync pause keeps it that way without restructuring.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function askOnce(): { verdict: ReturnType<typeof auditVerdict>; rawPreview: string } {
  let raw = "";
  try {
    raw = execFileSync("npm", ["audit", "--omit=dev", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    // npm exits non-zero for BOTH modes, and still writes the JSON to stdout — read it rather than
    // trusting the exit code, which is the very signal we cannot interpret.
    // ★Read BOTH streams. stderr is piped but was never consumed, so a failure that writes only
    // there produced an empty rawPreview and a generic reason — the same collapse #975 fixed by
    // keeping 403 distinguishable from 404. stdout first (npm writes the JSON there even when it
    // exits non-zero); stderr only as the fallback that used to be silently discarded.
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string };
    raw = e.stdout?.toString() || e.stderr?.toString() || "";
  }

  let parsed: Parameters<typeof auditVerdict>[0] = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null; // unparseable output is itself an endpoint-side symptom
  }

  // ★"no parseable audit report" collapses several distinct causes into one sentence — truncated
  // stdout, a proxy returning HTML, npm missing entirely, and today's undecoded-gzip all look
  // identical. Keep the first bytes so the next person can tell which. (Same reason #763 prints the
  // cause chain instead of just the message.)
  return { verdict: auditVerdict(parsed, { entries: AUDIT_ALLOWLIST, now: new Date() }), rawPreview: raw.trim().slice(0, 200).replace(/\s+/g, " ") };
}

const startedAt = Date.now();
let attempts = 0;
let attempt = askOnce();
attempts++;
while (mayRefetch(attempt.verdict) && Date.now() - startedAt < RETRY_BUDGET_MS) {
  console.log(
    `… audit could not be performed (attempt ${attempts}) — retrying the FETCH, not the verdict: ${attempt.verdict.reason}`,
  );
  sleepSync(RETRY_PAUSE_MS);
  attempt = askOnce();
  attempts++;
}

const { verdict, rawPreview } = attempt;
const elapsedMs = Date.now() - startedAt;

// ★Printed on EVERY path, including success. A retry loop hides flakiness by design — if the count
// is invisible, a run that needed four attempts looks exactly like one that needed none, and nobody
// notices the day it gets worse. (conductor's acceptance condition; same family as the alert nobody
// reads.) ★"attempts: 1" is the healthy shape; anything above it is the signal.
console.log(`  attempts: ${attempts} (${Math.round(elapsedMs / 1000)}s, budget ${RETRY_BUDGET_MS / 1000}s)`);

if (verdict.kind === "vulnerable") {
  console.error(`✗ audit: ${verdict.blocking} high/critical vulnerabilities in production dependencies`);
  for (const n of verdict.names) console.error(`    - ${n}`);
  summary(
    `### ✗ Security audit FAILED\n\n${verdict.blocking} high/critical in prod deps:\n\n` +
      verdict.names.map((n) => `- ${n}`).join("\n"),
  );
  process.exit(1);
}

if (verdict.kind === "clean") {
  console.log(
    `✓ audit: no high/critical in production dependencies (low ${verdict.low} / moderate ${verdict.moderate})`,
  );
  // ★An allowed advisory is still a finding. Say it on every run, so green never reads as "none".
  if (verdict.excused?.length) {
    const entries = AUDIT_ALLOWLIST.map((e) => `${e.advisory} (${e.package}) until ${e.until}`).join(", ");
    console.warn(
      `::warning::Allowed by lib/ci/audit-allowlist.ts, not fixed: ${verdict.excused.join(", ")} — ${entries}`,
    );
    summary(
      `### ⚠ Security audit passed with allowed advisories\n\n` +
        verdict.excused.map((n) => `- ${n}`).join("\n") +
        `\n\nAllowlist: ${entries}. After the date, the gate fails again.`,
    );
  }
  process.exit(0);
}

// ── (B) the audit could not be performed ──────────────────────────────────────────────────────────
if (bypassExpired(BYPASS_UNTIL, new Date())) {
  console.error(
    `✗ audit: could not be performed (${verdict.reason}), and the bypass expired on ${BYPASS_UNTIL}.\n` +
      `  This is deliberately a hard failure. Either the registry is still broken — check, then\n` +
      `  extend BYPASS_UNTIL in this file — or it recovered and this script should be deleted in\n` +
      `  favour of a plain \`npm audit --omit=dev --audit-level=high\`.`,
  );
  // ★The reason alone is often just "HTTP ?" — which after waiting out the retry budget tells the
  // operator nothing about WHY. rawPreview already existed but only reached the GitHub step summary,
  // so a local or logs-only reader never saw it. Now that this path can cost ~90s, the bytes that
  // distinguish ECONNREFUSED from a proxy's HTML from an undecoded gzip belong on stderr too.
  console.error(`  first 200 bytes of npm output: ${rawPreview || "(empty)"}`);
  summary(`### ✗ Security audit could not run — and the bypass EXPIRED (${BYPASS_UNTIL})\n\n${verdict.reason}`);
  process.exit(1);
}

// ★Loud, but not blocking. Green-with-a-warning is a deliberate state here, not an accident.
console.warn(
  `::warning::Security audit could NOT be performed (${verdict.reason}). Production dependencies were NOT checked in this run. Bypass expires ${BYPASS_UNTIL}.`,
);
console.warn(
  `⚠ audit: NOT PERFORMED — ${verdict.reason}\n` +
    `  This run says nothing about our dependencies. It is green because the audit API is\n` +
    `  unavailable, not because the dependencies were checked.\n` +
    `  ★When the API recovers, run this once before trusting any green.\n` +
    `  Bypass expires ${BYPASS_UNTIL} — after that this becomes a hard failure.`,
);
summary(
  `### ⚠ Security audit NOT PERFORMED\n\n${verdict.reason}\n\n` +
    `**This run did not check production dependencies.** Green here means "could not ask", not ` +
    `"nothing found".\n\nBypass expires **${BYPASS_UNTIL}**, after which this becomes a hard failure.\n\n` +
    `<details><summary>first 200 bytes of npm output</summary>\n\n\`\`\`\n${rawPreview || "(empty)"}\n\`\`\`\n</details>`,
);
process.exit(0);
