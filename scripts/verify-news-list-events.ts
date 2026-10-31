/**
 * Read-only check for 0066's done-condition (conductor 2026-10-30): after one ticked sign-up, one unticked sign-up and
 * one unsubscribe, each is a row in news_list_events. Prints, per email given, the rows' status / surface / product /
 * source / time — and for the import source, the count. No other row is read; the emails are the operator's own.
 *
 * Usage (kimny — reads DATABASE_URL from .env.local, i.e. production):
 *   npx tsx scripts/verify-news-list-events.ts <email> [<email> …]
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) throw new Error("usage: npx tsx scripts/verify-news-list-events.ts <email> [<email> …]");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not found in .env.local");
  const sql = neon(process.env.DATABASE_URL);
  for (const email of emails) {
    const rows = (await sql.query(
      "SELECT status, surface, product_key, source, occurred_at, recorded_at FROM news_list_events WHERE email = $1 ORDER BY recorded_at",
      [email],
    )) as Array<Record<string, unknown>>;
    console.log(`${email}: ${rows.length} row(s)`);
    for (const r of rows) {
      console.log(`  ${r.status} · ${r.surface} · ${r.product_key ?? "-"} · ${r.source ?? "-"} · occurred ${r.occurred_at ?? "unknown"} · recorded ${r.recorded_at}`);
    }
  }
  const [{ n }] = (await sql.query(
    "SELECT count(DISTINCT email)::int AS n FROM news_list_events WHERE source = 'resend_export_20261030' AND status = 'withdrawn'",
  )) as Array<{ n: number }>;
  console.log(`import (resend_export_20261030, withdrawn): ${n} email(s)`);
}

main().catch((err) => {
  console.error(`verify failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
