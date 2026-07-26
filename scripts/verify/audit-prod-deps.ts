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
 * Usage:  npx tsx scripts/verify/audit-prod-deps.ts
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { auditVerdict, bypassExpired } from "@/lib/ci/audit-verdict";

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
  raw = (err as { stdout?: Buffer | string }).stdout?.toString() ?? "";
}

let parsed: Parameters<typeof auditVerdict>[0] = null;
try {
  parsed = JSON.parse(raw);
} catch {
  parsed = null; // unparseable output is itself an endpoint-side symptom
}

const verdict = auditVerdict(parsed);

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
    `"nothing found".\n\nBypass expires **${BYPASS_UNTIL}**, after which this becomes a hard failure.`,
);
process.exit(0);
