#!/usr/bin/env node
/**
 * Waitlist snapshot script for SNS課 Window A/B/C reporting
 * Usage: BLOB_READ_WRITE_TOKEN=... node scripts/waitlist-snapshot.mjs
 *
 * Output: summary stats + CSV to stdout
 */

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN not set');
  process.exit(1);
}

const BASE_URL = 'https://blob.vercel-storage.com';

async function listAllEntryBlobs() {
  const entries = [];
  let cursor;

  do {
    const params = new URLSearchParams({ prefix: 'waitlist/', limit: '1000' });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`${BASE_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);

    const data = await res.json();
    for (const blob of data.blobs ?? []) {
      if (!blob.pathname.includes('/idx/')) entries.push(blob);
    }
    cursor = data.cursor;
  } while (cursor);

  return entries;
}

async function fetchEntry(blob) {
  const res = await fetch(blob.downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

async function main() {
  console.error('Fetching waitlist entries from Vercel Blob...');
  const blobs = await listAllEntryBlobs();
  console.error(`Found ${blobs.length} entry blobs`);

  const entries = (await Promise.all(blobs.map(fetchEntry))).filter(Boolean);

  const total = entries.length;
  const qualified = entries.filter(e => e.qualified_waitlist).length;
  const bySource = {};
  const byLocale = {};
  const byUtm = {};

  for (const e of entries) {
    byLocale[e.locale ?? 'unknown'] = (byLocale[e.locale ?? 'unknown'] ?? 0) + 1;
    const src = e.utm_source ?? 'direct';
    byUtm[src] = (byUtm[src] ?? 0) + 1;
    const s = e.source ?? 'unknown';
    bySource[s] = (bySource[s] ?? 0) + 1;
  }

  const snapshotAt = new Date().toISOString();

  console.log('\n=== Waitlist Snapshot ===');
  console.log(`Generated: ${snapshotAt}`);
  console.log(`Total registrations: ${total}`);
  console.log(`Qualified (score>=3): ${qualified} (${total ? Math.round(qualified/total*100) : 0}%)`);
  console.log('\nBy locale:');
  for (const [k, v] of Object.entries(byLocale)) console.log(`  ${k}: ${v}`);
  console.log('\nBy utm_source:');
  for (const [k, v] of Object.entries(byUtm)) console.log(`  ${k}: ${v}`);
  console.log('\nBy source:');
  for (const [k, v] of Object.entries(bySource)) console.log(`  ${k}: ${v}`);

  console.log('\n=== CSV ===');
  console.log('email,submitted_at,locale,qualified_waitlist,readiness_score,utm_source,utm_medium,utm_campaign,source');
  for (const e of entries.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))) {
    const row = [
      e.email, e.submitted_at, e.locale,
      e.qualified_waitlist, e.readiness_score,
      e.utm_source ?? '', e.utm_medium ?? '', e.utm_campaign ?? '',
      e.source ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    console.log(row);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
