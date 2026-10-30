/**
 * One-off: put the 86 people who had unsubscribed in Resend into news_list_events (0066) as `withdrawn`
 * (conductor 2026-10-30, (a)). They were deleted from Resend on 10/30 for the 1,000 window; the export taken just
 * before is the only record of their withdrawal.
 *
 *   status='withdrawn' · surface='import' · source='resend_export_20261030'
 *   occurred_at = NULL (Resend does not give the unsubscribe time) · recorded_at = the export time
 *
 * Usage (kimny, after 0066 is applied — reads DATABASE_URL from .env.local, i.e. production):
 *   npx tsx scripts/import-resend-withdrawn-20261030.ts "<path>/resend-export-20261030"            # dry run: counts only
 *   npx tsx scripts/import-resend-withdrawn-20261030.ts "<path>/resend-export-20261030" --apply    # writes
 *
 * Safe to re-run: an email that already has a row with this source is skipped. Prints counts only — no email.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
config({ path: ".env.local" });

const SOURCE = "resend_export_20261030";

/** Minimal RFC 4180 line parser (the export quotes fields that contain commas or quotes). */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function withdrawnEmails(csv: string): string[] {
  const [head, ...lines] = csv.trimEnd().split("\n");
  const cols = parseLine(head);
  const iEmail = cols.indexOf("email");
  const iUnsub = cols.indexOf("unsubscribed");
  if (iEmail < 0 || iUnsub < 0) throw new Error("contacts.csv has no email / unsubscribed column");
  const set = new Set<string>();
  for (const l of lines) {
    const v = parseLine(l);
    if (v[iUnsub] === "true" && v[iEmail]?.trim()) set.add(v[iEmail].trim().toLowerCase());
  }
  return [...set];
}

async function main() {
  const dir = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!dir) throw new Error("usage: npx tsx scripts/import-resend-withdrawn-20261030.ts <export dir> [--apply]");
  const exportedAt = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8")).exported_at as string;
  if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) throw new Error("summary.json has no exported_at");
  const emails = withdrawnEmails(readFileSync(join(dir, "contacts.csv"), "utf8"));
  console.log(`export ${exportedAt}: ${emails.length} unsubscribed in contacts.csv`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not found in .env.local");
  const sql = neon(process.env.DATABASE_URL);
  const existing = (await sql.query(
    "SELECT DISTINCT email FROM news_list_events WHERE source = $1 AND status = 'withdrawn'",
    [SOURCE],
  )) as Array<{ email: string }>;
  const have = new Set(existing.map((r) => r.email));
  const todo = emails.filter((e) => !have.has(e));
  console.log(`already imported: ${emails.length - todo.length} · to write: ${todo.length}${apply ? "" : " (dry run — add --apply to write)"}`);
  if (!apply || todo.length === 0) return;
  let written = 0;
  for (const email of todo) {
    await sql.query(
      "INSERT INTO news_list_events (email, status, surface, source, occurred_at, recorded_at) VALUES ($1, 'withdrawn', 'import', $2, NULL, $3)",
      [email, SOURCE, exportedAt],
    );
    written++;
  }
  const [{ n }] = (await sql.query(
    "SELECT count(DISTINCT email)::int AS n FROM news_list_events WHERE source = $1 AND status = 'withdrawn'",
    [SOURCE],
  )) as Array<{ n: number }>;
  console.log(`written: ${written} · now in news_list_events with this source: ${n}`);
}

if (process.argv[1]?.endsWith("import-resend-withdrawn-20261030.ts")) {
  main().catch((err) => {
    console.error(`import failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
