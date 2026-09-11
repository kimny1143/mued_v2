#!/usr/bin/env tsx
/**
 * Write `funnel-numbers.json` from a daily funnel report — the file kimny's PWA reads.
 *
 * Usage (from the collector's publish step):
 *   npx tsx scripts/emit-funnel-numbers.ts <report.json> <out.json>
 *
 * env: TRIGGER, RUN_URL, SOURCE_REPORT
 *
 * ★The derivation itself lives in lib/funnel/numbers.ts so it is unit-tested. This file is only the
 * plumbing: read, call, write. ★That split matters because this script runs exactly once a day, in
 * CI, unattended — the shape of check that nobody re-runs by hand. The logic worth being sure about
 * therefore has to be reachable from the test suite, not only from the cron.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { toFunnelNumbers, type FunnelReport } from "../lib/funnel/numbers";

const [reportPath, outPath] = process.argv.slice(2);
if (!reportPath || !outPath) {
  console.error("usage: tsx scripts/emit-funnel-numbers.ts <report.json> <out.json>");
  process.exit(2); // ★2 = could not run, not "nothing to report" (repo convention).
}

const report = JSON.parse(readFileSync(reportPath, "utf8")) as FunnelReport;

// ★Provenance is required, not defaulted. A hard-coded "schedule" would make a hand-run publish
//   describe itself as automated — the same failure the collector's own LAST_PUBLISH comment calls
//   out. Missing env is a broken caller, so it fails here rather than writing a plausible lie.
const trigger = process.env.TRIGGER;
const workflowRun = process.env.RUN_URL;
const sourceReport = process.env.SOURCE_REPORT;
if (!trigger || !workflowRun || !sourceReport) {
  console.error(
    `[funnel-numbers] TRIGGER / RUN_URL / SOURCE_REPORT must all be set (got ${JSON.stringify({ trigger, workflowRun, sourceReport })})`,
  );
  process.exit(2);
}

const numbers = toFunnelNumbers(report, { trigger, workflow_run: workflowRun, source_report: sourceReport });
writeFileSync(outPath, `${JSON.stringify(numbers, null, 2)}\n`);
console.log(`✓ funnel-numbers.json written from ${sourceReport}`);
console.log(`  reachable_contacts=${numbers.reachable_contacts} net_new_day=${numbers.net_new_day} ` +
  `remaining_to_1000=${numbers.remaining_to_1000} portal_registrations=${numbers.portal_registrations}`);
console.log(`  measured_at=${numbers.measured_at} trigger=${numbers.trigger}`);
