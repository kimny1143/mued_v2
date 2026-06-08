/**
 * MUEDial First-Run Free Campaign — lifetime-1 grant tracking.
 *
 * Mirrors lib/storage/mix-diagnosis-free.ts: a per-email marker in Vercel Blob
 * (BLOB_READ_WRITE_TOKEN, no new env) ensures each user can claim the free
 * campaign grant at most once. Deterministic pathname (addRandomSuffix: false)
 * makes mark idempotent — concurrent writes converge to a single blob.
 */
import { put, list } from '@vercel/blob';

function normalizeEmailKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
}

export async function checkFreeCampaignGrantUsed(email: string): Promise<boolean> {
  const emailKey = normalizeEmailKey(email);
  const { blobs } = await list({ prefix: `dial_free_campaign_grant/idx/${emailKey}`, limit: 1 });
  return blobs.length > 0;
}

export async function markFreeCampaignGrantUsed(email: string): Promise<void> {
  const emailKey = normalizeEmailKey(email);
  await put(
    `dial_free_campaign_grant/idx/${emailKey}.json`,
    JSON.stringify({ used_at: new Date().toISOString() }),
    { access: 'private', contentType: 'application/json', addRandomSuffix: false },
  );
}
