/**
 * MUEDial First-Run Free Campaign — config + eligibility.
 *
 * Path A: a free grant is a Stripe-bypass `paymentStatus: 'paid'` dialogue+mastering
 * session (see app/api/dial/campaign/start). Pool-funded (RoEx), bounded by:
 *   - per-session: baseCycleLimit=1 (one paid final) + reference-track disabled
 *   - campaign-wide: hard cap on grant count + DIAL_FREE_CAMPAIGN_ENABLED kill-switch
 *
 * Audience (kimny policy-gate 2026-06-08): default 'open' (cap-only 先着「演出」).
 * 'waitlist' mode is implemented as an emergency fallback (env switch, no re-arch).
 *
 * Kill-switch DEFAULT OFF — go-live (publish) is a separate gate.
 *
 * Env reads are call-time (getter functions) so the value can be flipped without
 * redeploy and so unit tests can toggle them.
 */
import { sql, eq } from 'drizzle-orm';
import { db } from '@/db';
import { dialSessions } from '@/db/schema';

export type FreeCampaignAudience = 'open' | 'waitlist';

/** Master kill-switch. DEFAULT OFF — campaign is invisible until explicitly enabled. */
export function isFreeCampaignEnabled(): boolean {
  return process.env.DIAL_FREE_CAMPAIGN_ENABLED === 'true';
}

/** 'open' = no waitlist check (cap-only 先着); 'waitlist' = waitlist-gated fallback. */
export function getFreeCampaignAudience(): FreeCampaignAudience {
  return process.env.DIAL_FREE_CAMPAIGN_AUDIENCE === 'waitlist' ? 'waitlist' : 'open';
}

/** Hard cap on total grants. Default 15 (pool 9,610 / ~530-600cr per journey). Env-overridable. */
export function getFreeCampaignCap(): number {
  const raw = Number(process.env.DIAL_FREE_CAMPAIGN_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 15;
}

/**
 * Fixed shape of a free-campaign session.
 * baseCycleLimit=1 caps the paid mix to a single final; additionalCycleLimit=0
 * blocks retake purchases. roexCrEstimate is bookkeeping (with stems ≈530, without ≈480).
 */
export const FREE_CAMPAIGN_SESSION = {
  mode: 'dialogue',
  masteringMode: 'omakase',
  baseCycleLimit: 1,
  additionalCycleLimit: 0,
  roexCrEstimate: 530,
} as const;

/** Count of free-campaign grant sessions issued so far (cap enforcement). */
export async function countFreeCampaignGrants(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dialSessions)
    .where(eq(dialSessions.isFreeCampaign, true));
  return Number(row?.count ?? 0);
}

export type FreeCampaignIneligibleReason =
  | 'disabled'
  | 'not_signed_in'
  | 'no_email'
  | 'not_waitlisted'
  | 'already_granted'
  | 'cap_reached'
  | 'error';

export interface FreeCampaignEligibility {
  eligible: boolean;
  reason: 'ok' | FreeCampaignIneligibleReason;
  remaining: number;
}

/**
 * Evaluate whether `email` may claim the free campaign grant.
 * Order: kill-switch → signed-in → email present → cap → audience(waitlist) → lifetime-1.
 * Fail-closed: any storage/db error → ineligible (never throws, never fail-open).
 *
 * `deps` is a testability seam (inject grant counter / blob checks in unit tests).
 */
export async function evaluateFreeCampaignEligibility(
  input: { signedIn: boolean; email: string | null },
  deps?: {
    countGrants?: () => Promise<number>;
    isWaitlisted?: (email: string) => Promise<boolean>;
    isGrantUsed?: (email: string) => Promise<boolean>;
  },
): Promise<FreeCampaignEligibility> {
  const cap = getFreeCampaignCap();

  if (!isFreeCampaignEnabled()) return { eligible: false, reason: 'disabled', remaining: 0 };
  if (!input.signedIn) return { eligible: false, reason: 'not_signed_in', remaining: cap };
  if (!input.email) return { eligible: false, reason: 'no_email', remaining: cap };

  try {
    const countGrants = deps?.countGrants ?? countFreeCampaignGrants;
    const isWaitlisted = deps?.isWaitlisted
      ?? (await import('@/lib/storage/waitlist-blob')).checkWaitlistEmailExists;
    const isGrantUsed = deps?.isGrantUsed
      ?? (await import('@/lib/storage/dial-free-campaign-grant')).checkFreeCampaignGrantUsed;

    const used = await countGrants();
    const remaining = Math.max(0, cap - used);
    if (remaining <= 0) return { eligible: false, reason: 'cap_reached', remaining: 0 };

    if (getFreeCampaignAudience() === 'waitlist') {
      if (!(await isWaitlisted(input.email))) {
        return { eligible: false, reason: 'not_waitlisted', remaining };
      }
    }

    if (await isGrantUsed(input.email)) {
      return { eligible: false, reason: 'already_granted', remaining };
    }

    return { eligible: true, reason: 'ok', remaining };
  } catch {
    return { eligible: false, reason: 'error', remaining: 0 };
  }
}
