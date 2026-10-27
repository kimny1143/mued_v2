// Demo sign-up recorder (0065 demo_signups). The demo entrance used to write the address only to the Resend list;
// past the free tier's contact limit that meant nowhere we own (kimny 2026-10-27 「直そう。」).
//
// BEST-EFFORT / FAIL-OPEN, the same rule as recordPluginEntitlement: the browser already has the download and the
// receipt is the deliverable, so a write failure must NEVER surface to the caller or block either. One row per
// (email, product_key): a repeat request keeps the first row's facts, but the two consent columns can only turn ON
// (CCO #1312: someone who first leaves the box unticked and ticks it on a second try is on the list — the row must say so).
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { demoSignups } from "@/db/schema";
import { logger } from "@/lib/utils/logger";

export type DemoProductKey = "masterchain" | "muedvox";

/** Returns true when the insert ran, false on a guard or a swallowed error. Never throws. */
export async function recordDemoSignup(opts: {
  productKey: DemoProductKey;
  /** The page the form was on, e.g. 'muedvox_lp' (the privacy policy's 「登録したページ」). */
  source: string;
  email: string;
  locale: "ja" | "en";
  firstTouch: Record<string, unknown> | null;
  /** The form's news checkbox (kimny 2026-10-28 「B」). */
  newsConsent: boolean;
  /** Added to the Resend list — only ever true with newsConsent. */
  audienceAdded: boolean;
}): Promise<boolean> {
  const email = opts.email?.trim().toLowerCase();
  if (!email) return false;
  try {
    await db
      .insert(demoSignups)
      .values({
        email,
        productKey: opts.productKey,
        source: opts.source,
        locale: opts.locale,
        firstTouch: opts.firstTouch,
        newsConsent: opts.newsConsent,
        // ★Never true without consent, whatever the caller says: the column means "a consenting person is on the list".
        audienceAdded: opts.newsConsent && opts.audienceAdded,
      })
      .onConflictDoUpdate({
        target: [demoSignups.email, demoSignups.productKey],
        // ★OR, never overwrite: once true, a later unticked request does not take it back.
        set: {
          newsConsent: sql`${demoSignups.newsConsent} OR excluded.news_consent`,
          audienceAdded: sql`${demoSignups.audienceAdded} OR excluded.audience_added`,
        },
      });
    return true;
  } catch (err) {
    logger.error(`[demo-signups] record failed (${opts.productKey})`, { error: String(err) });
    return false;
  }
}
