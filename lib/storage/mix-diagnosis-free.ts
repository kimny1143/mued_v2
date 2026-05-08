import { put, list } from '@vercel/blob';

function normalizeEmailKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
}

export async function checkMixDiagnosisFreeUsed(email: string): Promise<boolean> {
  const emailKey = normalizeEmailKey(email);
  const { blobs } = await list({ prefix: `mix_diag_free/idx/${emailKey}`, limit: 1 });
  return blobs.length > 0;
}

export async function markMixDiagnosisFreeUsed(email: string): Promise<void> {
  const emailKey = normalizeEmailKey(email);
  await put(
    `mix_diag_free/idx/${emailKey}.json`,
    JSON.stringify({ used_at: new Date().toISOString() }),
    { access: 'private', contentType: 'application/json', addRandomSuffix: false },
  );
}
