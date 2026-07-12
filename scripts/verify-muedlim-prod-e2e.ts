#!/usr/bin/env tsx
/**
 * PROD end-to-end verify of MUEDlim capture (conductor request, 2026-07-12).
 * Drives the LIVE subscribe endpoint (https://mued.jp/api/muedlim/subscribe) with a synthetic email,
 * then confirms via the Resend API that the contact landed in the dedicated MUEDlim audience
 * (243e06eb…4b5f). Polls to absorb the in-progress prod redeploy (env RESEND_MUEDLIM_AUDIENCE_ID
 * only takes effect once the new deployment is Ready).
 *
 * SAFETY: never blanket-deletes the audience — a real signup could land during the verify window.
 * Only the exact synthetic TEST_EMAIL contact is deleted at the end. Baseline contacts are left intact.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.error('RESEND_API_KEY missing'); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const AUD = '243e06eb-1ddc-441d-a241-1e2044ef4b5f';
const ENDPOINT = 'https://mued.jp/api/muedlim/subscribe';
const TEST_EMAIL = 'muedlim-verify-prod-20260712@mued.jp'; // synthetic; deleted at end
const MAX_ATTEMPTS = 6;
const INTERVAL_MS = 40_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function resendContacts(): Promise<Array<{ id: string; email: string }>> {
  const r = await fetch(`https://api.resend.com/audiences/${AUD}/contacts`, { headers: H });
  const b = await r.json().catch(() => ({}));
  return (b as { data?: Array<{ id: string; email: string }> })?.data ?? [];
}
async function subscribe() {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, locale: 'en', source: 'muedlim_verify' }),
  });
  const t = await r.text(); let b: unknown; try { b = JSON.parse(t); } catch { b = t; }
  return { status: r.status, body: b };
}

async function main() {
  const baseline = await resendContacts();
  console.log(`baseline: ${baseline.length} contact(s) in MUEDlim audience (left intact)`);
  if (baseline.some((c) => c.email === TEST_EMAIL)) {
    console.log('WARN: stale synthetic contact from a prior run present — will be cleaned at end.');
  }

  let landed: { id: string; email: string } | undefined;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const sub = await subscribe();
    console.log(`attempt ${i}: POST ${ENDPOINT} -> HTTP ${sub.status} ${JSON.stringify(sub.body)}`);
    await sleep(5_000); // let addPluginSubscriber + Resend propagate
    const contacts = await resendContacts();
    landed = contacts.find((c) => c.email === TEST_EMAIL);
    if (landed) {
      console.log(`✅ contact landed on attempt ${i}: id=${landed.id} (last4=${landed.id.slice(-4)})`);
      break;
    }
    console.log(`attempt ${i}: TEST_EMAIL not in audience yet (redeploy likely not Ready) — waiting ${INTERVAL_MS / 1000}s`);
    if (i < MAX_ATTEMPTS) await sleep(INTERVAL_MS);
  }

  // Surgical cleanup — delete ONLY the synthetic test contact.
  if (landed) {
    const del = await fetch(`https://api.resend.com/audiences/${AUD}/contacts/${landed.id}`, { method: 'DELETE', headers: H });
    const post = await resendContacts();
    console.log(`cleanup: delete synthetic ${landed.id.slice(-4)} -> HTTP ${del.status}; audience now ${post.length} contact(s)`);
  }

  console.log(`\n>>> RESULT: ${landed ? 'PASS ✅' : 'FAIL/PENDING ❌'}`);
  if (landed) {
    console.log(`    landed contact id last4 = ${landed.id.slice(-4)} (synthetic, cleaned)`);
  } else {
    console.log(`    no synthetic contact landed after ${MAX_ATTEMPTS} attempts — redeploy may not be Ready. Ask conductor for Vercel deploy status, then re-run.`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(String(e)); process.exit(1); });
