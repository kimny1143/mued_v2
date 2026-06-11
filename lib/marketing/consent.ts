/**
 * Marketing consent recording — the write path for the self-owned list (handoff Step 2).
 *
 * recordConsent writes the append-only ledger row AND updates the de-normalized current value on
 * users, in one transaction. After the tx commits it fires a best-effort, non-blocking Resend
 * Audience sync (no await on the response path; a Resend failure never rolls back the consent record
 * or affects the caller — product課 review #3).
 *
 * The caller MUST pass the INTERNAL users.id (UUID), not the Clerk id — marketing_consents.user_id is
 * a FK to users.id. Resolve via getUserIdFromClerkId (lib/utils/auth-helpers) at the call site.
 */
import { db } from '@/db';
import {
  marketingConsents,
  users,
  type MarketingConsentSource,
  type MarketingConsentStatus,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { syncConsentToAudience } from './audience-sync';

/**
 * Privacy-policy version recorded with each consent. MUST match the privacy policy `lastUpdated`
 * (messages/*.json `privacy`) so a consent records the version the user actually saw. Bump this when
 * the marketing-purpose addition lands in the policy (content課 draft, kimny voice-checked 2026-06-11).
 */
export const MARKETING_POLICY_VERSION = '2026-06-11';

export interface RecordConsentInput {
  /** INTERNAL users.id (UUID) — NOT the Clerk id (FK to users.id). */
  userId: string;
  status: MarketingConsentStatus;
  source: MarketingConsentSource;
  locale: 'ja' | 'en';
  /** Defaults to MARKETING_POLICY_VERSION. */
  policyVersion?: string;
}

export async function recordConsent(opts: RecordConsentInput): Promise<void> {
  const granted = opts.status === 'granted';

  // Ledger insert + de-normalized current value, atomically.
  await db.transaction(async (tx) => {
    await tx.insert(marketingConsents).values({
      userId: opts.userId,
      status: opts.status,
      source: opts.source,
      locale: opts.locale,
      policyVersion: opts.policyVersion ?? MARKETING_POLICY_VERSION,
    });
    await tx
      .update(users)
      .set({ marketingConsent: granted, marketingConsentAt: new Date() })
      .where(eq(users.id, opts.userId));
  });

  // Fire-and-forget Audience sync — never blocks the response or affects the tx above (product #3).
  // No-op when the Resend Audience isn't configured yet (audience-sync handles that).
  void (async () => {
    try {
      const [u] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, opts.userId))
        .limit(1);
      if (u?.email) {
        await syncConsentToAudience({ email: u.email, name: u.name, status: opts.status });
      }
    } catch (err) {
      logger.warn('[recordConsent] background audience sync failed', { err: String(err) });
    }
  })();
}
