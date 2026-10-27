// Demo sign-up recorder (0065 demo_signups). The demo entrance used to write the address only to the Resend list;
// past the free tier's contact limit that meant nowhere we own (kimny 2026-10-27 「直そう。」).
//
// BEST-EFFORT / FAIL-OPEN, the same rule as recordPluginEntitlement: the browser already has the download and the
// receipt is the deliverable, so a write failure must NEVER surface to the caller or block either. Idempotent
// (UNIQUE(email, product_key) → onConflictDoNothing): a repeat request keeps the first row.
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
        // The demo forms always show 「ダウンロードリンクの送付と、MUEDsp のお知らせに…」 (kimny 2026-10-04).
        newsNoticeShown: true,
        audienceAdded: opts.audienceAdded,
      })
      .onConflictDoNothing({ target: [demoSignups.email, demoSignups.productKey] });
    return true;
  } catch (err) {
    logger.error(`[demo-signups] record failed (${opts.productKey})`, { error: String(err) });
    return false;
  }
}
