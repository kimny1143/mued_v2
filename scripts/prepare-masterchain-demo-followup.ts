#!/usr/bin/env tsx
/** Read-only Resend preparation. No send, create, update or subscription operation exists here. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { emailTemplates } from "../lib/services/email.service";
import { MUEDSP_AUDIENCE_ID } from "../lib/plugins/registry";
import { listResendPages, selectDemoFollowup, type FollowupClick, type FollowupContact, type FollowupEmail } from "../lib/masterchain/demo-followup";
import { parseResendTime } from "../lib/funnel/newsletter-metrics";

type Identified<T> = T & { id: string };
interface Broadcast { id: string; subject: string; status: string; sent_at: string; audience_id?: string; segment_id?: string }
interface Mail extends FollowupEmail { id: string; created_at: string }
const args = process.argv.slice(2);
const previewOnly = args[0] === "--preview-only";
const out = resolve(args[1] ?? "reports/masterchain-demo-followup");
const ids = args.slice(2);
const key = process.env.RESEND_API_KEY;

async function get(path: string): Promise<unknown> {
  await new Promise(r => setTimeout(r, 550));
  const response = await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Resend GET failed: HTTP ${response.status}`);
  return response.json();
}
function write(name: string, body: string) {
  writeFileSync(join(out, name), body, { mode: 0o600, flag: "wx" });
}
async function main() {
  if (!previewOnly && (args[0] !== "--prepare" || !key || !ids.length || ids.some(id => !/^[a-f0-9-]{36}$/.test(id)))) {
    throw new Error("Usage: tsx scripts/prepare-masterchain-demo-followup.ts --preview-only OUT or --prepare OUT BROADCAST_ID... (RESEND_API_KEY required)");
  }
  // A fresh private output folder prevents accidentally reusing a stale recipient file after a failed run.
  mkdirSync(out, { recursive: false, mode: 0o700 });
  for (const locale of ["en", "ja"] as const) {
    const mail = emailTemplates.masterchainDemoFollowup(locale);
    write(`${locale}.html`, mail.html);
    write(`${locale}.txt`, `${mail.subject}\n\n${mail.text}`);
  }
  if (previewOnly) { console.log("Email previews written; no API requests or sends."); return; }
  const started = new Date().toISOString();
  const broadcasts: Broadcast[] = [];
  const clicks: FollowupClick[] = [];
  const excluded: string[] = [];
  for (const id of new Set(ids)) {
    const b = await get(`/broadcasts/${id}`) as Broadcast;
    if (b.status !== "sent" || !/masterchain is here|MUEDsp on Windows/i.test(b.subject) || (b.segment_id ?? b.audience_id) !== MUEDSP_AUDIENCE_ID || !Number.isFinite(parseResendTime(b.sent_at))) throw new Error("Source broadcast did not match the approved campaign/segment");
    broadcasts.push({ ...b, id });
    const clicked = await listResendPages<Identified<FollowupClick>>(get, `/broadcasts/${id}/recipients?type=clicked`);
    if (clicked.some(c => typeof c.email !== "string" || !Array.isArray(c.clicked_links))) throw new Error("Recipient click URLs unavailable; cannot distinguish product and unsubscribe clicks");
    clicks.push(...clicked);
    for (const type of ["unsubscribed", "bounced", "complained", "suppressed"]) {
      const rows = await listResendPages<{ id: string; email: string }>(get, `/broadcasts/${id}/recipients?type=${type}`);
      excluded.push(...rows.map(r => r.email));
    }
  }
  const contacts = await listResendPages<Identified<FollowupContact>>(get, `/segments/${MUEDSP_AUDIENCE_ID}/contacts`);
  const emails = await listResendPages<Mail>(get, "/emails");
  if (contacts.some(c => typeof c.email !== "string" || typeof c.unsubscribed !== "boolean") || emails.some(e => !Array.isArray(e.to) || typeof e.subject !== "string" || typeof e.last_event !== "string")) throw new Error("Unexpected contact/email shape");
  // The demo launched on Sep 30. Retention must reach before then, otherwise absence is not evidence.
  const historyStart = Date.parse("2026-09-30T00:00:00Z");
  const times = emails.map(e => parseResendTime(e.created_at));
  if (!times.length || times.some(t => !Number.isFinite(t)) || Math.min(...times) > historyStart) throw new Error("Email history does not cover demo launch; cannot establish demo-email absence");
  const result = selectDemoFollowup({ clicks, contacts, emails, excluded });
  write("recipients.json", JSON.stringify(result.recipients, null, 2));
  const summary = {
    status: "prepared-not-sent", started_at: started, completed_at: new Date().toISOString(),
    broadcasts: broadcasts.map(b => ({ id: b.id, subject: b.subject, sent_at: b.sent_at })),
    counts: result.counts, email_history_oldest: new Date(Math.min(...times)).toISOString(),
    notes: ["Counts describe email events, not completed downloads. Exclusion counts may overlap.", "Recipient language is unknown: do not infer it from addresses. Use one bilingual broadcast or verified language preferences.", "Refresh before sending; recipient API can be cached for 15 minutes. Never resubscribe contacts.", "Previews contain a Resend broadcast unsubscribe placeholder. No sends or remote mutations were performed."],
  };
  write("summary.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(() => { console.error("Preparation failed; no send occurred. Check source IDs, API access, complete history and use a fresh output directory."); process.exitCode = 1; });
