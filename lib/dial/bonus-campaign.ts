import { db } from '@/db';
import { users, dialCreditPacks, dialBonusCampaignLedger, dialCampaignState } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const CAMPAIGN_NAME = 'first_purchase_400cr';
const BONUS_CREDITS = 400;
const ESTIMATED_COST_USD = 3.2; // 400cr × $0.008/cr
const ALERT_THRESHOLDS = [80, 95, 100] as const;

export interface BonusGrantResult {
  granted: boolean;
  newCumulativeCostUsd?: number;
  crossedThreshold?: number; // alert milestone newly crossed (80/95/100)
}

/** Pure helper — finds the lowest threshold newly crossed between prevPct and newPct
 *  that hasn't already been alerted (> lastAlerted). */
export function findCrossedThreshold(
  prevPct: number,
  newPct: number,
  lastAlerted: number | null,
): number | undefined {
  for (const t of ALERT_THRESHOLDS) {
    if (prevPct < t && newPct >= t && (lastAlerted === null || lastAlerted < t)) {
      return t;
    }
  }
  return undefined;
}

export async function grantFirstPurchaseBonus(
  clerkUserId: string,
  tx: Transaction,
): Promise<BonusGrantResult> {
  const maxCostUsd = parseFloat(process.env.DIAL_BONUS_CAMPAIGN_MAX_COST_USD || '1500');

  // Lock campaign state row — prevent concurrent grants from racing the budget cap
  const [campaign] = await tx
    .select()
    .from(dialCampaignState)
    .where(eq(dialCampaignState.campaignName, CAMPAIGN_NAME))
    .for('update')
    .limit(1);

  if (!campaign || !campaign.enabled) {
    logger.debug('[BonusCampaign] Campaign disabled or not seeded', { clerkUserId });
    return { granted: false };
  }

  const currentCost = parseFloat(campaign.cumulativeCostUsd as string);
  const currentPct = (currentCost / maxCostUsd) * 100;
  const lastAlerted = campaign.lastAlertedThreshold ?? null;

  // Budget cap exceeded — send 100% alert if not already sent
  if (currentCost + ESTIMATED_COST_USD > maxCostUsd) {
    logger.info('[BonusCampaign] Budget cap reached', { currentCost, maxCostUsd });

    let crossedThreshold: number | undefined;
    if (lastAlerted === null || lastAlerted < 100) {
      crossedThreshold = 100;
      await tx
        .update(dialCampaignState)
        .set({ lastAlertedThreshold: 100, updatedAt: new Date() })
        .where(eq(dialCampaignState.campaignName, CAMPAIGN_NAME));
    }

    return { granted: false, newCumulativeCostUsd: currentCost, crossedThreshold };
  }

  // Lock user row — idempotency guard against duplicate webhook delivery
  const [user] = await tx
    .select({ id: users.id, bonusGranted: users.dialFirstPurchaseBonusGranted })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .for('update')
    .limit(1);

  if (!user || user.bonusGranted) {
    logger.debug('[BonusCampaign] Already granted or user not found', { clerkUserId });
    return { granted: false };
  }

  const completedAt = new Date();
  const expiresAt = new Date(completedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const [newPack] = await tx
    .insert(dialCreditPacks)
    .values({
      userId: clerkUserId,
      packSize: 'bonus',
      credits: BONUS_CREDITS,
      creditsRemaining: BONUS_CREDITS,
      amountCents: 0,
      status: 'completed',
      source: 'bonus',
      completedAt,
      expiresAt,
    })
    .returning({ id: dialCreditPacks.id });

  await tx.insert(dialBonusCampaignLedger).values({
    userId: clerkUserId,
    creditPackId: newPack.id,
    bonusCredits: BONUS_CREDITS,
    estimatedCostUsd: ESTIMATED_COST_USD.toFixed(4),
  });

  await tx
    .update(users)
    .set({ dialFirstPurchaseBonusGranted: true })
    .where(eq(users.clerkId, clerkUserId));

  const newCost = currentCost + ESTIMATED_COST_USD;
  const newPct = (newCost / maxCostUsd) * 100;

  // Determine if a new alert threshold was crossed
  const crossedThreshold = findCrossedThreshold(currentPct, newPct, lastAlerted);

  await tx
    .update(dialCampaignState)
    .set({
      cumulativeCostUsd: newCost.toFixed(4),
      ...(crossedThreshold !== undefined ? { lastAlertedThreshold: crossedThreshold } : {}),
      updatedAt: new Date(),
    })
    .where(eq(dialCampaignState.campaignName, CAMPAIGN_NAME));

  logger.info('[BonusCampaign] 400cr bonus granted', {
    clerkUserId,
    packId: newPack.id,
    newCumulativeCostUsd: newCost,
    crossedThreshold,
  });

  return { granted: true, newCumulativeCostUsd: newCost, crossedThreshold };
}
