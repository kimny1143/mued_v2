import { IntegratedLandingContent } from "@/components/features/landing";
import {
  isFreeCampaignEnabled,
  getFreeCampaignCap,
  countFreeCampaignGrants,
} from "@/lib/dial/free-campaign";
import { logger } from "@/lib/utils/logger";

/**
 * free15 first-run campaign gate for the mued.jp MUEDial promo.
 *
 * Shows only while the campaign is live (kill-switch ON) AND spots remain. The env
 * check short-circuits the DB count, so the default-OFF common case adds no query to
 * this high-traffic page. Fail-closed: a DB hiccup hides the promo, it never breaks
 * the (top-of-funnel) landing page.
 */
async function isFree15PromoActive(): Promise<boolean> {
  if (!isFreeCampaignEnabled()) return false;
  try {
    return getFreeCampaignCap() - (await countFreeCampaignGrants()) > 0;
  } catch (error) {
    logger.error("[landing] free15 promo gate check failed", { error });
    return false;
  }
}

/**
 * Landing Content - MUED Integrated Landing Page
 *
 * Single page with all products:
 * 1. Brand Hero - MUED intro with scroll CTAs
 * 2. MUEDnote Section - Full hero + features
 * 3. MUEDear Section - Full hero + games/features
 * 4. Social Proof + Final CTA
 */
export async function LandingContent() {
  const freeCampaignActive = await isFree15PromoActive();

  return <IntegratedLandingContent freeCampaignActive={freeCampaignActive} />;
}
