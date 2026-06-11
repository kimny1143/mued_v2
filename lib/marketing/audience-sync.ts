/**
 * DB → Resend Audience sync for the self-owned marketing list (handoff Step 5).
 *
 * No-op-safe: when RESEND_MARKETING_AUDIENCE_ID is not configured (the Audience hasn't been created
 * yet) this does nothing — so PR1 (schema + capture + recordConsent) can ship and run BEFORE the
 * Resend Audience exists. Once the env is set, granted → add contact (subscribed), withdrawn →
 * mark unsubscribed.
 *
 * Always best-effort: every call is caught and logged. A sync failure must NEVER roll back the
 * consent ledger write or block the caller's response (the ledger in marketing_consents is the
 * source of truth; the Audience is a downstream projection). Callers invoke this fire-and-forget.
 */
import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';

const AUDIENCE_ID = process.env.RESEND_MARKETING_AUDIENCE_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!AUDIENCE_ID || !RESEND_API_KEY) return null; // Audience not configured → no-op
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

/** True when the Resend Audience is configured (env present) — sync will actually run. */
export function isAudienceSyncEnabled(): boolean {
  return !!AUDIENCE_ID && !!RESEND_API_KEY;
}

export async function syncConsentToAudience(opts: {
  email: string;
  name?: string | null;
  status: 'granted' | 'withdrawn';
}): Promise<void> {
  const resend = getClient();
  if (!resend || !opts.email) return; // no-op when unconfigured
  try {
    if (opts.status === 'granted') {
      await resend.contacts.create({
        audienceId: AUDIENCE_ID!,
        email: opts.email,
        unsubscribed: false,
        ...(opts.name ? { firstName: opts.name } : {}),
      });
    } else {
      // Withdrawn → keep the contact but mark unsubscribed (preserves suppression on re-grant).
      await resend.contacts.update({ audienceId: AUDIENCE_ID!, email: opts.email, unsubscribed: true });
    }
  } catch (err) {
    // Best-effort: a duplicate-on-create or transient Resend error must not surface to the caller.
    logger.warn('[audience-sync] best-effort sync failed', { err: String(err), status: opts.status });
  }
}
