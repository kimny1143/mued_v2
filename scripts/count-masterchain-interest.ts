#!/usr/bin/env tsx
/**
 * Read-only row count for `masterchain_interest` (+ the first/last created_at date).
 *
 * ★WHY THIS EXISTS AS A SCRIPT: production DB access is kimny's, by a harness gate that a peer relay
 * cannot satisfy — and rightly so. But "kimny runs it" does not mean "kimny writes the SQL". The org
 * assembles the query; kimny runs one command. (memory: feedback-automate-before-writing-a-runbook)
 *
 *   npx tsx scripts/count-masterchain-interest.ts
 *
 * ★NO PII LEAVES THIS SCRIPT. It selects aggregates only — count(*), min/max(created_at)::date. It
 * never selects `email`, `first_touch` or `user_id`, so its output is safe to paste into a peer
 * message or a ledger. If you extend it, keep that property: the moment a row-level column appears
 * here, the output stops being pasteable and someone will paste it anyway.
 *
 * ★READ-ONLY BY CONSTRUCTION: one SELECT, no transaction, no writes. `.env.local` is read by
 * `db/index.ts` (dotenv), so DATABASE_URL is whatever that file holds — note that Development,
 * Preview and Production share one value in this project, i.e. this reads PRODUCTION.
 */
import { sql } from "drizzle-orm";

import { db } from "../db";

async function main() {
  // ★JST, taken by this process immediately before the read — a timestamp written afterwards drifts.
  const measuredAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" });

  const res = await db.execute(sql`
    SELECT count(*)::int                  AS rows,
           min(created_at)::date::text    AS first_date,
           max(created_at)::date::text    AS last_date
    FROM masterchain_interest
  `);

  const r = res.rows[0] as { rows: number; first_date: string | null; last_date: string | null };

  console.log(`measured_at (JST) : ${measuredAt}`);
  console.log(`table             : masterchain_interest`);
  console.log(`rows              : ${r.rows}`);
  // ★An empty table gives NULL for both dates. Print that as "—" rather than "null", and never as
  // today's date: a fabricated range is worse than no range.
  // ★The dates are UTC, NOT JST like measured_at above. `created_at` is `timestamp` without time
  // zone, written by defaultNow() under the server session TimeZone (measured GMT — memory
  // reference-dial-prod-db-direct-query), so its wall clock is UTC; `::date::text` runs server-side,
  // so the driver never re-parses it. A row written 00:00–08:59 JST shows the previous day here.
  // Say so on the line itself: two zones on adjacent lines with one label is a misread waiting.
  const utcDate = (d: string | null) => (d === null ? "— (0 rows)" : `${d} (UTC date)`);
  console.log(`first created_at  : ${utcDate(r.first_date)}`);
  console.log(`last created_at   : ${utcDate(r.last_date)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // ★Fail loudly. A count that silently becomes 0 on a connection error is the dangerous direction.
    console.error("FAILED — no number was measured:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
