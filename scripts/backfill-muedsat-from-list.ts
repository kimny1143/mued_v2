//
// User portal P-3 — MUEDsat (c) reconstruction backfill (conductor dispatch 2026-07-17).
//
// The MUEDsat capture list was never segmented (RESEND_MUEDSAT_AUDIENCE_ID → the shared General
// audience), so muedsat could NOT be backfilled from an audience like muedlim was — it would grant
// ownership to the whole marketing list (over-grant). Instead the TRUE muedsat downloaders are
// reconstructed from the Resend DELIVERED-LOG of the download-link email, unioned with the quota-
// incident rescue list and a live API top-up:
//   union = Chief delivered-log base (7/5–7/16 22:33Z CSV) ∪ rescue list ∪ Resend top-up (>= cutoff)
//
// ★PII: the email lists are PII. They live ONLY in gitignored scripts/tmp/ and are NEVER committed,
// PR'd, printed, or sent externally. This script (no emails inline) is committable; it reads emails
// from file/API and reports COUNTS ONLY. The frozen union.txt stays in scripts/tmp/muedsat-c/.
//
// FREEZE-THEN-COMMIT: `--build` assembles + dedups the union, writes the frozen union file, and
// prints counts (base/rescue/topup/union-unique). `--commit` inserts EXACTLY that frozen file, so the
// count conductor verifies == the count kimny writes (no drift). IDEMPOTENT (onConflictDoNothing on
// UNIQUE(email, plugin_key)) — safe to re-run. RUN IS GATED: --commit = prod write = kimny in-session.
//
//   npx tsx scripts/backfill-muedsat-from-list.ts --build \
//     --base /Volumes/strage/_DevProjects/_chief/.scratch/sat-delivered-258-20260717.txt \
//     [--rescue scripts/tmp/muedsat-c/rescue.txt] [--topup-since "2026-07-16 22:33:00"] [--no-topup]
//   npx tsx scripts/backfill-muedsat-from-list.ts --commit     # write frozen union (GATED — kimny)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { pluginEntitlements } from "@/db/schema";

const PLUGIN = "muedsat";
const SOURCE = "muedsat_backfill";
const CHUNK = 500;
const UNION_PATH = "scripts/tmp/muedsat-c/union.txt";
const DEFAULT_BASE = "/Volumes/strage/_DevProjects/_chief/.scratch/sat-delivered-258-20260717.txt";
const DEFAULT_RESCUE = "scripts/tmp/muedsat-c/rescue.txt";
const DEFAULT_TOPUP_CUTOFF = "2026-07-16 22:33:00"; // Chief base window end (UTC), space-separated to match Resend created_at

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const MODE = process.argv.includes("--commit") ? "commit" : "build";

// Extract lowercased emails from arbitrary text (skips '#' headers / non-email lines). Excludes *@example.com.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
function extractEmails(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw || raw.trimStart().startsWith("#")) continue;
    const matches = raw.match(EMAIL_RE);
    if (!matches) continue;
    for (const m of matches) {
      const e = m.trim().toLowerCase();
      if (e.endsWith("@example.com")) continue;
      out.add(e);
    }
  }
  return out;
}
function readEmails(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  return extractEmails(readFileSync(path, "utf8"));
}

type Email = { id: string; to?: string[]; subject?: string; last_event?: string; created_at?: string };
function isSatDownload(subject?: string): boolean {
  const s = subject || "";
  return /MUEDsat/i.test(s) && /(download|ダウンロード)/i.test(s); // case-insensitive: subject casing may drift
}
const norm = (s?: string) => String(s || "").replace("T", " "); // Resend created_at → space-separated for lexicographic compare

// Live Resend top-up: sat download-link emails, last_event='delivered', created_at >= cutoff.
async function fetchTopup(cutoff: string): Promise<Set<string>> {
  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) throw new Error("RESEND_API_KEY not set — cannot fetch top-up");
  const H = { Authorization: `Bearer ${KEY}` };
  const emails = new Set<string>();
  let url: string | null = "https://api.resend.com/emails?limit=100";
  let pages = 0;
  while (url && pages < 30) {
    const r: Response = await fetch(url, { headers: H });
    const b = (await r.json()) as { data?: Email[]; has_more?: boolean };
    const data = b.data || [];
    pages++;
    for (const e of data) {
      if (!isSatDownload(e.subject)) continue;
      if (e.last_event !== "delivered") continue;
      if (norm(e.created_at) < cutoff) continue;
      // Normalize through the SAME email regex as file sources (handles "Name <email>" form) so the
      // build-time union == the --commit re-parse of the frozen file (freeze-then-commit invariant).
      (e.to || []).forEach((t) => {
        const m = String(t).toLowerCase().match(EMAIL_RE);
        if (m) for (const em of m) if (!em.endsWith("@example.com")) emails.add(em);
      });
    }
    const oldest = data.length ? norm(data[data.length - 1].created_at) : "";
    if (!b.has_more || (oldest && oldest < cutoff)) break;
    const last = data[data.length - 1];
    url = last ? `https://api.resend.com/emails?limit=100&after=${last.id}` : null;
  }
  return emails;
}

async function countRows(): Promise<number> {
  const res = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pluginEntitlements)
    .where(eq(pluginEntitlements.pluginKey, PLUGIN));
  return res[0]?.c ?? 0;
}

function union(...sets: Set<string>[]): Set<string> {
  const u = new Set<string>();
  for (const s of sets) for (const e of s) u.add(e);
  return u;
}
function intersectCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const e of a) if (b.has(e)) n++;
  return n;
}

async function build(): Promise<void> {
  const basePath = arg("--base") ?? DEFAULT_BASE;
  const rescuePath = arg("--rescue") ?? DEFAULT_RESCUE;
  const topupSince = arg("--topup-since") ?? DEFAULT_TOPUP_CUTOFF;

  if (!existsSync(basePath)) {
    console.error(`[muedsat-c] base file ${basePath} not found — abort (fail-closed; base is required).`);
    process.exit(1);
  }
  const base = readEmails(basePath);
  const rescue = readEmails(rescuePath);
  const topup = arg("--no-topup") ? new Set<string>() : await fetchTopup(topupSince);
  const all = union(base, rescue, topup);

  console.log(`[muedsat-c] BUILD (no DB write)`);
  console.log(`  base    (${basePath.split("/").pop()}): unique=${base.size}${existsSync(basePath) ? "" : "  ⚠ FILE MISSING"}`);
  console.log(`  rescue  (${rescuePath.split("/").pop()}): unique=${rescue.size}${existsSync(rescuePath) ? "" : "  (not provided)"}`);
  console.log(`  topup   (Resend >= ${topupSince}): unique=${topup.size}`);
  console.log(`  overlaps: base∩rescue=${intersectCount(base, rescue)} base∩topup=${intersectCount(base, topup)} rescue∩topup=${intersectCount(rescue, topup)}`);
  console.log(`  UNION unique = ${all.size}  (sum=${base.size + rescue.size + topup.size}, dedup removed ${base.size + rescue.size + topup.size - all.size})`);

  const header = [
    `# MUEDsat (c) reconstruction — FROZEN union (PII — gitignored, never commit/PR/send)`,
    `# built from: base=${basePath} rescue=${existsSync(rescuePath) ? rescuePath : "(none)"} topup>=${topupSince}`,
    `# counts: base=${base.size} rescue=${rescue.size} topup=${topup.size} union_unique=${all.size}`,
    `# plugin_key=${PLUGIN} source=${SOURCE} — idempotent onConflictDoNothing`,
  ].join("\n");
  writeFileSync(UNION_PATH, header + "\n" + [...all].sort().join("\n") + "\n", "utf8");
  console.log(`  → frozen union written: ${UNION_PATH} (${all.size} emails). Report counts to conductor; --commit writes THIS file.`);
}

async function commit(): Promise<void> {
  if (!existsSync(UNION_PATH)) {
    console.error(`[muedsat-c] frozen union ${UNION_PATH} not found — run --build first.`);
    process.exit(1);
  }
  const emails = readEmails(UNION_PATH);
  if (emails.size === 0) {
    console.error(`[muedsat-c] frozen union is empty — aborting.`);
    process.exit(1);
  }
  const rows = [...emails].map((email) => ({ email, pluginKey: PLUGIN, source: SOURCE }));
  console.log(`[muedsat-c] COMMIT (writing) — frozen union unique=${rows.length}`);
  const before = await countRows(); // SELECT self-verifies the table exists before any write
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db
      .insert(pluginEntitlements)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoNothing({ target: [pluginEntitlements.email, pluginEntitlements.pluginKey] });
  }
  const after = await countRows();
  console.log(`  muedsat: inserted new=${after - before} (was ${before}, now ${after})`);
  console.log(`[muedsat-c] done. new rows written=${after - before}`);
}

async function main(): Promise<void> {
  if (MODE === "commit") await commit();
  else await build();
  process.exit(0);
}
main().catch((e: unknown) => {
  // PII-safe: print message/code only — a raw pg error object can embed row values (emails).
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  console.error(`[muedsat-c] fatal: ${msg}${code ? ` (code ${code})` : ""}`);
  process.exit(1);
});
