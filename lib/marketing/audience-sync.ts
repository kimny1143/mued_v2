/**
 * DB → Resend marketing-list sync for the self-owned list (handoff Step 5).
 *
 * Resend migrated Audiences → Segments. The two are the SAME id space — GET /audiences and
 * GET /segments return identical ids (verified 2026-07-06) — so this module uses the segments-native
 * API. The env holds that segment id: RESEND_MARKETING_SEGMENT_ID (preferred), with the legacy
 * RESEND_MARKETING_AUDIENCE_ID as a backward-compat fallback so an already-set legacy env keeps
 * working with no re-set (the value is the same id). See:
 * https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments
 *
 * No-op-safe: when the segment id is not configured this does nothing — so PR1 (schema + capture +
 * recordConsent) can ship and run BEFORE the segment is wired. Once set, granted → contact added to
 * the segment (subscribed), withdrawn → contact globally unsubscribed (suppression preserved on re-grant).
 *
 * Always best-effort: every call is caught and logged. A sync failure must NEVER roll back the
 * consent ledger write or block the caller's response (the ledger in marketing_consents is the
 * source of truth; the segment membership is a downstream projection). Callers invoke this fire-and-forget.
 */
import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';

// audienceId === segmentId (same Resend id space). Prefer the new env name, fall back to the legacy
// one so a value already set under RESEND_MARKETING_AUDIENCE_ID keeps working without a re-set.
const SEGMENT_ID = process.env.RESEND_MARKETING_SEGMENT_ID ?? process.env.RESEND_MARKETING_AUDIENCE_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!SEGMENT_ID || !RESEND_API_KEY) return null; // segment not configured → no-op
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

/** True when the Resend marketing segment is configured (env present) — sync will actually run. */
export function isAudienceSyncEnabled(): boolean {
  return !!SEGMENT_ID && !!RESEND_API_KEY;
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
      // New contact → create it directly into the segment. If the contact already exists (create →
      // duplicate error), fall back to ensuring segment membership + re-subscribing (the re-grant case).
      try {
        await resend.contacts.create({
          email: opts.email,
          unsubscribed: false,
          ...(opts.name ? { firstName: opts.name } : {}),
          segments: [{ id: SEGMENT_ID! }],
        });
      } catch {
        await resend.contacts.segments.add({ email: opts.email, segmentId: SEGMENT_ID! });
        await resend.contacts.update({ email: opts.email, unsubscribed: false });
      }
    } else {
      // Withdrawn → global unsubscribe (keeps the contact but suppresses; preserves suppression on re-grant).
      await resend.contacts.update({ email: opts.email, unsubscribed: true });
    }
  } catch (err) {
    // Best-effort: a duplicate-on-create or transient Resend error must not surface to the caller.
    logger.warn('[audience-sync] best-effort sync failed', { err: String(err), status: opts.status });
  }
}
