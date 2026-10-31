// Recorder for news_list_events (0066) — see db/schema/news-list-events.ts for what the table means.
//
// BEST-EFFORT / FAIL-OPEN, the same rule as recordPluginEntitlement and recordDemoSignup: the download, the receipt, the
// license and the unsubscribe page are the deliverables, so a write failure must NEVER surface to the caller or block
// any of them. Its own insert, never part of a delivery's insert or transaction (conductor (a)).
//
// ★The one caller that DOES act on the result is the list trim: it removes an unsubscribed contact from Resend only
//   after that person's withdrawal is written here (lib/marketing/list-window.ts) — so false matters there.
import { db } from "@/db";
import { newsListEvents, type NewsListStatus, type NewsListSurface } from "@/db/schema";
import { logger } from "@/lib/utils/logger";

export type NewsListEventInput = {
  email: string;
  status: NewsListStatus;
  surface: NewsListSurface;
  productKey?: string | null;
  source?: string | null;
  locale?: "ja" | "en" | null;
  /** When it really happened; null = not known (resend_footer, import). Default: now. */
  occurredAt?: Date | null;
};

/** Returns true when the row was written, false on a guard or a swallowed error. Never throws. Logs no email. */
export async function recordNewsListEvent(evt: NewsListEventInput): Promise<boolean> {
  const email = evt.email?.trim().toLowerCase();
  if (!email) return false;
  try {
    await db.insert(newsListEvents).values({
      email,
      status: evt.status,
      surface: evt.surface,
      productKey: evt.productKey ?? null,
      source: evt.source ?? null,
      locale: evt.locale ?? null,
      occurredAt: evt.occurredAt === undefined ? new Date() : evt.occurredAt,
    });
    return true;
  } catch (err) {
    logger.error(`[news-list-events] record failed (${evt.surface} ${evt.status})`, { error: String(err) });
    return false;
  }
}

/** The checkbox as answered: only `true` is consent. */
export const checkboxStatus = (ticked: unknown): NewsListStatus => (ticked === true ? "granted" : "not_granted");
