#!/usr/bin/env tsx
/**
 * VERIFY the MUEDlim subscribe path (conductor step ④) against the real Resend account.
 *  1) no-op when RESEND_MUEDLIM_AUDIENCE_ID unset → addPluginSubscriber("muedlim") returns false.
 *  2) active when set → returns true and creates a contact in the dedicated MUEDlim audience.
 *  3) confirm the contact lands (GET /audiences/{id}/contacts count delta).
 *  4) cleanup: delete the synthetic test contact so real signups start from a clean list.
 *
 * Exercises the real lib (lib/plugins/audience.ts) — pluginAudienceId reads process.env at call time.
 * Local RESEND_API_KEY == prod Resend account (General id 6293ccef matches prod), so this is faithful.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const AUDIENCE_ID = '243e06eb-1ddc-441d-a241-1e2044ef4b5f'; // dedicated "MUEDlim" audience
const TEST_EMAIL = 'muedlim-verify-20260712@mued.jp';       // synthetic; deleted at end
const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.error('RESEND_API_KEY missing'); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(method: string, path: string) {
  const res = await fetch(`https://api.resend.com${path}`, { method, headers: H });
  const t = await res.text(); let b: unknown; try { b = JSON.parse(t); } catch { b = t; }
  return { status: res.status, ok: res.ok, body: b };
}
function contactCount(body: unknown): number {
  return ((body as { data?: unknown[] })?.data ?? []).length;
}

async function main() {
  // Ensure a clean starting state for the "unset" branch.
  delete process.env.RESEND_MUEDLIM_AUDIENCE_ID;
  const mod = await import('@/lib/plugins/audience');

  // (1) no-op when unset
  const enabledOff = mod.isPluginAudienceEnabled('muedlim');
  const r1 = await mod.addPluginSubscriber('muedlim', { email: TEST_EMAIL, locale: 'en' });
  console.log(`[unset]  isPluginAudienceEnabled=${enabledOff}  addPluginSubscriber=${r1}   (expect: false / false)`);

  // baseline contact count (before)
  const before = await api('GET', `/audiences/${AUDIENCE_ID}/contacts`);
  const nBefore = contactCount(before.body);

  // (2) active when set
  process.env.RESEND_MUEDLIM_AUDIENCE_ID = AUDIENCE_ID;
  const enabledOn = mod.isPluginAudienceEnabled('muedlim');
  const idSeen = mod.pluginAudienceId('muedlim');
  const r2 = await mod.addPluginSubscriber('muedlim', { email: TEST_EMAIL, locale: 'en' });
  console.log(`[set]    isPluginAudienceEnabled=${enabledOn}   audienceId=${idSeen?.slice(-4)}   addPluginSubscriber=${r2}   (expect: true / 4b5f / true)`);

  // (3) confirm contact landed
  const after = await api('GET', `/audiences/${AUDIENCE_ID}/contacts`);
  const nAfter = contactCount(after.body);
  console.log(`[verify] MUEDlim audience contacts: before=${nBefore} after=${nAfter}  (expect after = before + 1)`);

  // (4) cleanup — remove the synthetic test contact
  const del = await api('DELETE', `/audiences/${AUDIENCE_ID}/contacts/email/${encodeURIComponent(TEST_EMAIL)}`);
  const post = await api('GET', `/audiences/${AUDIENCE_ID}/contacts`);
  console.log(`[cleanup] delete status=${del.status}  contacts now=${contactCount(post.body)}  (expect back to ${nBefore})`);

  const pass = enabledOff === false && r1 === false && enabledOn === true && r2 === true && nAfter === nBefore + 1;
  console.log(`\n>>> RESULT: ${pass ? 'PASS ✅' : 'FAIL ❌'}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(String(e)); process.exit(1); });
