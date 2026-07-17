//
// User portal P-3 — MUEDsat (c) RESCUE set reconstruction (conductor ③ 復元式・Chief authoritative).
//
// The quota-incident rescue cohort (people who submitted the DL form during the 7/16 Resend quota
// block, so their welcome was NOT delivered, and were manually sent BOTH sat+lim links by kimny
// outside Resend) is reconstructed by SET SUBTRACTION — no date window (whole-set subtraction =
// zero interpretation drift, conductor 2026-07-17):
//
//   rescue = ( MUEDlim audience ALL contacts (API)  −  lim delivered-welcome set (Chief file) )  ∪  Ian
//          = diff (expected ≈19: quota-rejected ∪ a few bounced — bounced entitlement is harmless,
//            idempotent, and the portal is a download-rescue surface) ∪ Ian (individual owner).
//
// This writes rescue.txt (the --rescue input for scripts/backfill-muedsat-from-list.ts). READ-ONLY vs
// prod DB (Resend list + local files only). ★PII: emails go ONLY to the gitignored out file; this
// script has no emails inline and reports COUNTS ONLY.
//
//   npx tsx scripts/compute-muedsat-rescue-diff.ts \
//     [--subtrahend <lim-delivered-190.txt>] [--ian <ian.txt>] [--out scripts/tmp/muedsat-c/rescue.txt]
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.error("RESEND_API_KEY missing (.env.local)"); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}` };

// Same dedicated MUEDlim audience P-3 backfilled (209 unique). Identifier, not a secret.
const MUEDLIM_AUDIENCE = "243e06eb-1ddc-441d-a241-1e2044ef4b5f";
const DEFAULT_SUB = "/Volumes/strage/_DevProjects/_chief/.scratch/lim-delivered-190-20260717.txt";
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "scripts/tmp/muedsat-c/rescue.txt";
function optArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
function extractEmails(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw || raw.trimStart().startsWith("#")) continue;
    const m = raw.toLowerCase().match(EMAIL_RE);
    if (m) for (const e of m) if (!e.endsWith("@example.com")) out.add(e.trim());
  }
  return out;
}
function readEmails(path: string): Set<string> {
  return existsSync(path) ? extractEmails(readFileSync(path, "utf8")) : new Set();
}

type Contact = { email?: string | null; unsubscribed?: boolean };
async function fetchAudience(id: string): Promise<Set<string>> {
  const r = await fetch(`https://api.resend.com/audiences/${id}/contacts`, { headers: H });
  const text = await r.text();
  if (!r.ok) throw new Error(`audience list ${r.status}: ${text.slice(0, 120)}`);
  const body = JSON.parse(text) as { data?: Contact[]; has_more?: boolean };
  if (body.has_more) console.warn("  ⚠ audience has_more=true — single-call list may be truncated (pagination not implemented).");
  const set = new Set<string>();
  for (const c of body.data ?? []) {
    const e = c.email?.trim().toLowerCase();
    if (e && !e.endsWith("@example.com")) set.add(e);
  }
  return set;
}

async function main() {
  const subPath = optArg("--subtrahend") ?? DEFAULT_SUB;
  const ianPath = optArg("--ian");
  if (!existsSync(subPath)) { console.error(`[rescue] subtrahend ${subPath} not found — abort.`); process.exit(1); }

  const audience = await fetchAudience(MUEDLIM_AUDIENCE);
  const sub = readEmails(subPath);
  const diff = new Set([...audience].filter((e) => !sub.has(e)));
  const ian = ianPath ? readEmails(ianPath) : new Set<string>();
  const ianInDiff = [...ian].filter((e) => diff.has(e)).length;
  const rescue = new Set([...diff, ...ian]);

  console.log(`[rescue] reconstruction (READ-ONLY vs DB)`);
  console.log(`  lim audience (API ${MUEDLIM_AUDIENCE.slice(0, 8)}…): ${audience.size}   (P-3 backfilled 209)`);
  console.log(`  lim delivered subtrahend (${subPath.split("/").pop()}): ${sub.size}`);
  console.log(`  DIFF (audience − delivered) = ${diff.size}   (expected ≈19: quota-rejected ∪ bounced)`);
  console.log(`  Ian (${ianPath ? ianPath.split("/").pop() : "not provided"}): ${ian.size}  already-in-diff=${ianInDiff}  new=${ian.size - ianInDiff}`);
  console.log(`  RESCUE (diff ∪ Ian) unique = ${rescue.size}`);

  const header = [
    `# MUEDsat (c) RESCUE set (PII — gitignored, never commit/PR/send)`,
    `# = ( lim audience ${audience.size} − lim delivered ${sub.size} ) ∪ Ian ${ian.size}  =  diff ${diff.size} ∪ Ian(new ${ian.size - ianInDiff})  =  ${rescue.size}`,
    `# subtrahend=${subPath} ian=${ianPath ?? "(none)"}`,
  ].join("\n");
  writeFileSync(OUT, header + "\n" + [...rescue].sort().join("\n") + "\n", "utf8");
  console.log(`  → rescue written: ${OUT} (${rescue.size} emails). Feed to: backfill-muedsat-from-list.ts --build --rescue ${OUT}`);
}
main().then(() => process.exit(0)).catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[rescue] fatal: ${msg}`);
  process.exit(1);
});
