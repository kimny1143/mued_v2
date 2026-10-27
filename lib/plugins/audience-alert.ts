import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";

/**
 * Tell the operator that a subscriber did not reach a Resend list — at most once a day.
 *
 * ★Why the cap (conductor 2026-10-27, (b)): the marketing plan was cancelled, so the free tier's 1,000-contact limit
 *   is already passed (1,262). From then on EVERY sign-up fails the list add, and one alert per sign-up is an inbox
 *   flood that also spends the transactional send quota. The failure itself stays fully visible: each caller logs
 *   every one at error before calling this. Only the email is capped.
 * ★The cap is the rate limiter's "operator-alert-daily" bucket: exact across instances while Upstash works, one a day
 *   per instance on its in-memory fallback (which production is on since 2026-10-22). Never throws, never blocks.
 */
export async function alertAudienceAddFailed(tag: string): Promise<void> {
  const alertEmail = process.env.OPERATOR_ALERT_EMAIL;
  if (!alertEmail || !emailService.isConfigured()) return;
  const slot = await checkRateLimit("operator-alert-daily", "operator-alert:audience-add").catch(() => null);
  if (slot && !slot.success) return; // already alerted today — the log has the rest
  await emailService
    .sendAdminAlert(
      alertEmail,
      `[${tag}] Resend audience add failed for a subscriber — lead not captured to Resend. Check Resend / audience config (contact limit?). ` +
        "This alert is sent at most once a day; every further failure today is in the Vercel log only.",
    )
    .catch((err) => logger.error(`[${tag}] operator alert failed`, { error: String(err) }));
}
