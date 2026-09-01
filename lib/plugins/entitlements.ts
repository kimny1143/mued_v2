//
// User portal — plugin entitlement recorder (P-1 of docs/portal/plan-brief-user-portal-20260717.md).
//
// Writes the self-owned ownership row (email → plugin) that the portal (/dashboard/plugins) joins
// against so a logged-in user sees "your plugins + latest version" without re-fetching an email link.
// The subscribe email-gate is UNAUTHENTICATED, so user_id is unknown here (nullable) — the portal
// matches by the Clerk-verified email instead.
//
// BEST-EFFORT / FAIL-OPEN: the honest deliverable is the welcome email's download link (sent by the
// subscribe handler). This record is a portal convenience — a write failure must NEVER surface to the
// caller or block the download. Idempotent (UNIQUE(email, plugin_key) → onConflictDoNothing), so a
// re-subscribe is a no-op. The P-3 backfill (Resend audience → entitlements) is the reconciliation net
// for any write lost here or predating this record (the existing 250+ leads).
import { db } from "@/db";
import { pluginEntitlements } from "@/db/schema";
import { logger } from "@/lib/utils/logger";
import type { PluginKey } from "@/lib/plugins/registry";

/**
 * Record (idempotently) that `email` owns access to `plugin`'s downloads. Returns true when an insert
 * was attempted, false on a guard/no-op or a swallowed error. NEVER throws — a portal-record failure
 * must not affect the subscribe response (the email delivery is the honest deliverable).
 *
 * ★`locale` (0061) is the landing-page surface the capture came from. The subscribe payload has
 * carried it since P-1 and used it for the welcome email and the Resend audience, but discarded it
 * before this call — so the page a person actually used was recorded nowhere. It is written now that
 * production has the column (applied 2026-09-01).
 *
 * ★It records WHICH PAGE WAS USED, not a person's language or country. And because the subscribe zod
 * schema is `.default("en")`, a request that omits the field is stored as 'en': ★a `ja` count is
 * exact, an `en` count is an UPPER bound. Rows written before 0061 are NULL, which is neither.
 *
 * ★ON CONFLICT DO NOTHING means a RE-subscribe does not backfill locale onto an existing row — the
 * value reflects the FIRST capture, not the latest. That is the intended reading (when they first
 * arrived), and it is why an existing row staying NULL is not a bug.
 */
export async function recordPluginEntitlement(
  plugin: PluginKey,
  opts: {
    email: string;
    source: string;
    firstTouch?: Record<string, unknown> | null;
    locale?: "ja" | "en" | null;
  }
): Promise<boolean> {
  const email = opts.email?.trim().toLowerCase();
  if (!email) return false;
  try {
    await db
      .insert(pluginEntitlements)
      .values({
        email,
        pluginKey: plugin,
        source: opts.source,
        firstTouch: opts.firstTouch ?? null,
        locale: opts.locale ?? null,
      })
      // ON CONFLICT (email, plugin_key) DO NOTHING — matches uq_plugin_entitlements_email_plugin.
      .onConflictDoNothing({
        target: [pluginEntitlements.email, pluginEntitlements.pluginKey],
      });
    return true;
  } catch (err) {
    // Best-effort: a raced duplicate or transient DB error must not surface. Backfill reconciles.
    logger.error(`[plugins/entitlements] record failed (${plugin})`, { error: String(err) });
    return false;
  }
}
