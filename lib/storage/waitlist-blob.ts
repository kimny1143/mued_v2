import { put, list } from '@vercel/blob';

export interface WaitlistEntry {
  email: string;
  submitted_at: string;
  readiness_score: number;
  qualified_waitlist: boolean;
  launch_ready_recent: boolean;
  dtm_years: 'under_1y' | '1_3y' | '3_5y' | 'over_5y' | null;
  challenge: string | null;
  locale: 'en' | 'ja';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  source: string;
}

function normalizeEmailKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
}

export async function putWaitlistEntry(
  entry: WaitlistEntry
): Promise<{ url: string; pathname: string }> {
  const now = new Date(entry.submitted_at);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const emailKey = normalizeEmailKey(entry.email);
  const ts = now.getTime();
  const pathname = `waitlist/${yyyy}/${mm}/${ts}_${emailKey}.json`;

  const blob = await put(pathname, JSON.stringify(entry), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return { url: blob.url, pathname: blob.pathname };
}

export async function checkWaitlistEmailExists(email: string): Promise<boolean> {
  const emailKey = normalizeEmailKey(email);
  const { blobs } = await list({ prefix: `waitlist/idx/${emailKey}`, limit: 1 });
  return blobs.length > 0;
}

export async function putWaitlistIndex(email: string, entryPathname: string): Promise<void> {
  const emailKey = normalizeEmailKey(email);
  await put(
    `waitlist/idx/${emailKey}.json`,
    JSON.stringify({ entryPathname, created_at: new Date().toISOString() }),
    { access: 'private', contentType: 'application/json', addRandomSuffix: false }
  );
}
