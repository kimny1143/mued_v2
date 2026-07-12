#!/usr/bin/env tsx
/**
 * Create a DEDICATED Resend audience "MUEDlim" for the MUEDlim free-download list.
 * Authorized: kimny GO (2026-07-12, via conductor dispatch) — dedicated per-plugin segmentation
 * per lib/plugins/registry.ts (audienceEnvName="RESEND_MUEDLIM_AUDIENCE_ID").
 *
 * Idempotent: if an audience named "MUEDlim" already exists, prints its id (no double-create).
 * Reversible: DELETE /audiences/{id} removes it. No contacts touched (no PII).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.error('RESEND_API_KEY missing'); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const BASE = 'https://api.resend.com';

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, ok: res.ok, body: parsed };
}

async function main() {
  // 1) Guard: does an audience named "MUEDlim" already exist?
  const list = await req('GET', '/audiences');
  const data = (list.body as { data?: Array<{ id: string; name: string }> })?.data ?? [];
  console.log('=== existing audiences (before) ===');
  console.log(JSON.stringify(data, null, 2));
  const existing = data.find((a) => a.name === 'MUEDlim');
  if (existing) {
    console.log(`\n>>> "MUEDlim" already exists: ${existing.id} (last4=${existing.id.slice(-4)}) — no create.`);
    return;
  }

  // 2) Create the dedicated MUEDlim audience.
  console.log('\n=== POST /audiences {name:"MUEDlim"} ===');
  const created = await req('POST', '/audiences', { name: 'MUEDlim' });
  console.log(JSON.stringify(created, null, 2));
  if (created.ok) {
    const id = (created.body as { id?: string })?.id;
    if (id) console.log(`\n>>> CREATED "MUEDlim": ${id} (last4=${id.slice(-4)})`);
  } else {
    console.log('\n>>> CREATE FAILED — plan may not allow multiple audiences (see status/body above).');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(String(e)); process.exit(1); });
