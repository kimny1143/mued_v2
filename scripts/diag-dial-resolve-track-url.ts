#!/usr/bin/env tsx
/**
 * Diagnostic: prove the resolveTrackUrl / isGcsUrlExpired behavior for the Yuu goodwill
 * preview-500 incident (2026-06-15). Pure local, deterministic — runs the REAL exported
 * resolveTrackUrl against representative URL shapes. NO prod, NO network.
 *
 * Question: when a copied track carries an EXPIRED / unparseable roex_upload_url + a live
 * r2_url, does resolveTrackUrl return the (dead) GCS URL or fall back to r2_url?
 *
 * Usage: npx tsx scripts/diag-dial-resolve-track-url.ts
 */
import { resolveTrackUrl } from '../lib/dial/resolve-track-url';

const R2 = 'https://mued-r2.example/stream/abc.wav'; // stand-in live r2_url

const cases: { name: string; roexUploadUrl: string; r2Url: string | null }[] = [
  {
    name: 'A. RoEx GCS signed URL WITH X-Goog-Date/Expires, dated months ago (expired)',
    roexUploadUrl:
      'https://storage.googleapis.com/tonn-audio/uuid/stem.wav?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Date=20260301T120000Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=deadbeef',
    r2Url: R2,
  },
  {
    name: 'B. GCS-ish URL WITHOUT X-Goog-Date/Expires (unparseable expiry)',
    roexUploadUrl: 'https://storage.googleapis.com/tonn-audio/uuid/stem.wav',
    r2Url: R2,
  },
  {
    name: 'C. Arbitrary/legacy URL, no query params at all',
    roexUploadUrl: 'https://example.test/old/stem.wav',
    r2Url: R2,
  },
  {
    name: 'D. X-Goog-Date present but X-Goog-Expires missing (partial)',
    roexUploadUrl:
      'https://storage.googleapis.com/tonn-audio/uuid/stem.wav?X-Goog-Date=20260301T120000Z&X-Goog-Signature=deadbeef',
    r2Url: R2,
  },
  {
    name: 'E. Same as B but NO r2_url (worst case)',
    roexUploadUrl: 'https://storage.googleapis.com/tonn-audio/uuid/stem.wav',
    r2Url: null,
  },
];

console.log('=== resolveTrackUrl diagnostic (Yuu preview-500 root-cause) ===\n');
for (const c of cases) {
  const resolved = resolveTrackUrl({ roexUploadUrl: c.roexUploadUrl, r2Url: c.r2Url });
  const verdict =
    resolved === null
      ? '⚠️  returned null → "stem expired, re-upload" actionable error (not a 500 dead-end)'
      : resolved === c.r2Url
        ? '✅ returned r2_url (safe → preview works)'
        : resolved === c.roexUploadUrl
          ? '❌ returned the (dead) roex_upload_url → RoEx fetch fails → 500'
          : `? unexpected: ${resolved}`;
  console.log(`${c.name}\n  → ${verdict}\n`);
}
console.log(
  'Mechanism: isGcsUrlExpired() returns FALSE when getGcsExpiry() cannot parse X-Goog-Date/Expires\n' +
    '(resolve-track-url.ts ~line 39-43), so resolveTrackUrl treats an unparseable URL as "not expired"\n' +
    'and returns roex_upload_url verbatim — even when it is long dead. Cases B/C/D are the failure path.',
);
