import { put } from '@vercel/blob';

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

export async function putWaitlistEntry(
  entry: WaitlistEntry
): Promise<{ url: string; pathname: string }> {
  const now = new Date(entry.submitted_at);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  // Use email hash as unique key to prevent duplicates
  const emailKey = entry.email.replace(/[^a-z0-9]/g, '_').slice(0, 40);
  const ts = now.getTime();
  const pathname = `waitlist/${yyyy}/${mm}/${ts}_${emailKey}.json`;

  const blob = await put(pathname, JSON.stringify(entry), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return { url: blob.url, pathname: blob.pathname };
}
