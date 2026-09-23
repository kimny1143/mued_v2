#!/usr/bin/env tsx
/**
 * Read-only count of completed MUEDial deliverables that have NO R2 copy recorded
 * (`dial_tasks.r2_final_url IS NULL`), split by task type and by who paid.
 *
 *   npx tsx scripts/count-dial-finals-missing-r2.ts
 *
 * ★WHY: until PR #1096, when the session GET's inline poll completed a final / mix_check /
 * mastering task, its R2 row update was built inside `.then()` and never awaited — a Drizzle query
 * only runs when awaited — so `r2_final_url` was never written on that path. Without an R2 copy the
 * download depends on RoEx's GCS URL, and once RoEx purges the task (days, per #465) it returns 410.
 * This script measures how many existing rows are in that state, and how many are recent enough
 * that the RoEx task may still exist (i.e. a re-copy could still work).
 *
 * ★The org assembles the query; kimny runs one command (production DB read is kimny's).
 *
 * ★NO PII LEAVES THIS SCRIPT. Aggregates only — counts and one date. It never selects ids, user ids,
 * emails or URLs, so the output can be pasted into a peer message or a ledger. Keep it that way.
 *
 * ★READ-ONLY: one SELECT, no transaction, no writes. `.env.local` is read by `db/index.ts`, and
 * Development / Preview / Production share one DATABASE_URL in this project — this reads PRODUCTION.
 *
 * ★TIME: `completed_at` is `timestamp` without time zone, written as a UTC wall clock (session
 * TimeZone measured GMT on a read session — memory reference-dial-prod-db-direct-query; the writer's
 * role/DB-level settings are not measured). `completed_at AT TIME ZONE 'UTC'` turns it into the true
 * instant before comparing with now(), so the age buckets do not depend on this session's TimeZone.
 * The "last" date is printed as a UTC date and labelled so.
 */
import { sql } from "drizzle-orm";

import { db } from "../db";

type Row = {
  task_type: string;
  completed: number;
  with_r2: number;
  missing_r2: number;
  missing_r2_le_3d: number;
  missing_r2_paid: number;
  missing_r2_free_campaign: number;
  last_missing_date: string | null;
};

async function main() {
  // ★JST, taken by this process immediately before the read.
  const measuredAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" });

  const res = await db.execute(sql`
    SELECT t.task_type::text                                                        AS task_type,
           count(*)::int                                                            AS completed,
           count(*) FILTER (WHERE t.r2_final_url IS NOT NULL)::int                  AS with_r2,
           count(*) FILTER (WHERE t.r2_final_url IS NULL)::int                      AS missing_r2,
           count(*) FILTER (WHERE t.r2_final_url IS NULL
                              AND now() - (t.completed_at AT TIME ZONE 'UTC') <= interval '3 days')::int
                                                                                    AS missing_r2_le_3d,
           count(*) FILTER (WHERE t.r2_final_url IS NULL AND s.payment_status = 'paid'
                              AND NOT s.is_free_campaign)::int                      AS missing_r2_paid,
           count(*) FILTER (WHERE t.r2_final_url IS NULL AND s.is_free_campaign)::int AS missing_r2_free_campaign,
           (max(t.completed_at) FILTER (WHERE t.r2_final_url IS NULL))::date::text  AS last_missing_date
    FROM dial_tasks t
    JOIN dial_sessions s ON s.id = t.session_id
    WHERE t.status = 'completed'
      AND t.final_url IS NOT NULL
      AND t.final_url NOT LIKE 'https://dev-dummy.%'
      AND t.task_type IN ('final_basic', 'final_advanced', 'mix_check', 'mastering')
    GROUP BY t.task_type
    ORDER BY t.task_type
  `);

  const rows = res.rows as Row[];

  console.log(`measured_at (JST) : ${measuredAt}`);
  console.log(`scope             : dial_tasks completed with a final_url (dev-dummy excluded)`);
  console.log(`                    task_type in final_basic / final_advanced / mix_check / mastering`);
  if (rows.length === 0) {
    // ★Say what zero means here: no completed deliverables at all, not "none are missing".
    console.log(`rows              : 0 — no completed deliverable in scope (so nothing to be missing)`);
    return;
  }
  console.log("");
  console.log("task_type        completed  with_r2  missing_r2  missing<=3d  missing_paid  missing_free15  last_missing (UTC date)");
  for (const r of rows) {
    console.log(
      [
        r.task_type.padEnd(15),
        String(r.completed).padStart(9),
        String(r.with_r2).padStart(8),
        String(r.missing_r2).padStart(11),
        String(r.missing_r2_le_3d).padStart(12),
        String(r.missing_r2_paid).padStart(13),
        String(r.missing_r2_free_campaign).padStart(15),
        `  ${r.last_missing_date ?? "—"}`,
      ].join(""),
    );
  }
  console.log("");
  console.log("with_r2 > 0 somewhere = the R2 copy itself works on the other completion paths (control).");
  console.log("missing<=3d = the RoEx task may still exist (purge takes days — approximate), so a re-copy may still work.");
  console.log("missing_paid excludes free-campaign sessions; sessions that are neither (comp / goodwill / test) are in missing_r2 only.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // ★Fail loudly. A count that silently becomes 0 on a connection error is the dangerous direction.
    console.error("FAILED — no number was measured:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
