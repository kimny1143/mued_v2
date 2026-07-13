//
// Shared email-gate subscribe handler for the MUEDsp free-download plugin family (案A / registry).
// Extracted from app/api/muedsat/subscribe/route.ts — for plugin="muedsat" it is byte-for-byte
// equivalent to the old route (same rate-limit bucket, same zod schema incl. source default, same
// Resend audience env, same welcome email, same fail-open after()). The per-plugin subscribe routes
// (/api/muedsat, /api/muedlim) are thin wrappers around this. Regression 0 for MUEDsat is proven in
// tests/unit/plugin-subscribe.test.ts.
//
// Delivery is HONEST, not fake-open: the welcome email carries the download link (= the deliverable),
// so it is sent synchronously and its failure returns a non-200 (the UI shows a retry path instead of
// a false "sent"). The audience add (lead capture) is best-effort and does NOT fail the request — but
// a configured-but-failed add is logged + operator-alerted so a lead loss is visible, never silent.
// While staged (audience id unset) the audience add is a legitimate no-op (not treated as a failure).
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { addPluginSubscriber, isPluginAudienceEnabled } from "@/lib/plugins/audience";
import { emailService, type EmailResult } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";

function schemaFor(plugin: PluginKey) {
  return z.object({
    email: z.string().email().transform((e) => e.toLowerCase().trim()),
    locale: z.enum(["ja", "en"]).default("en"),
    source: z.string().max(64).default(PLUGIN_DIST[plugin].source),
    utm_source: z.string().max(128).nullable().optional(),
    utm_medium: z.string().max(128).nullable().optional(),
    utm_campaign: z.string().max(128).nullable().optional(),
    utm_content: z.string().max(128).nullable().optional(),
  });
}

// Per-plugin welcome email — kept as separate email-service methods so each plugin's copy is
// independent (MUEDsat's email is untouched by the MUEDlim add).
async function sendWelcome(plugin: PluginKey, email: string, locale: "ja" | "en") {
  if (plugin === "muedsat") {
    return emailService.sendMuedsatDownloadWelcome({ email }, { locale });
  }
  return emailService.sendMuedlimDownloadWelcome({ email }, { locale });
}

/** POST handler for a plugin's free-download email gate. Used by the per-plugin route wrappers. */
export async function handlePluginSubscribe(plugin: PluginKey, request: NextRequest) {
  // Reuse the "research" bucket (5 req/min/IP) — same shape of sensitive public submit.
  const rateLimitResponse = await rateLimit(request, "research");
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError("Invalid JSON");
  }

  const parsed = schemaFor(plugin).safeParse(body);
  if (!parsed.success) {
    return apiValidationError("Validation failed", parsed.error.flatten());
  }

  const { email, locale } = parsed.data;

  // Plugin closed to "coming soon" (registry.live = false, e.g. MUEDlim from 2026-07-13) — no-op the
  // capture so the email gate + download are fully disabled while closed. The UI form is already
  // hidden; this covers a stray direct POST. Live siblings (MUEDsat) are unaffected. Benign 200.
  if (!PLUGIN_DIST[plugin].live) {
    return apiSuccess({ subscribed: false });
  }

  // 1) Lead capture — add to the plugin's Resend audience. Best-effort + no-op-safe while staged, but
  //    capture the outcome: a configured-but-failed add is a lead loss that must be VISIBLE (logged +
  //    operator-alerted), never silent. It does NOT fail the request — the user still gets their
  //    download below, which is the honest thing to report.
  const audienceConfigured = isPluginAudienceEnabled(plugin);
  const listCaptured = await addPluginSubscriber(plugin, { email, locale }).catch((err) => {
    logger.error(`[${plugin}/subscribe] audience add threw`, { error: String(err) });
    return false;
  });
  if (audienceConfigured && !listCaptured) {
    logger.error(`[${plugin}/subscribe] audience add failed — lead not captured to Resend`, { plugin });
    const alertEmail = process.env.OPERATOR_ALERT_EMAIL;
    if (alertEmail && emailService.isConfigured()) {
      // Best-effort operator alert — never blocks the response.
      void emailService
        .sendAdminAlert(
          alertEmail,
          `[${plugin}/subscribe] Resend audience add failed for a subscriber — lead not captured. Check Resend / audience config.`,
        )
        .catch((err) => logger.error(`[${plugin}/subscribe] operator alert failed`, { error: String(err) }));
    }
  }

  // 2) Deliver the download-link email SYNCHRONOUSLY — it carries the DL link (= the deliverable), so
  //    the HTTP response MUST reflect real delivery. (Previously this ran in after() AFTER the 200, so
  //    a send failure was invisible and the UI falsely claimed "sent" — the bug this fix closes.)
  if (!emailService.isConfigured()) {
    logger.error(`[${plugin}/subscribe] email service not configured — cannot deliver the download link`);
    return apiError("We couldn't send the download email. Please try again shortly.", {
      code: "EMAIL_DELIVERY_FAILED",
      status: 502,
    });
  }
  const emailResult: EmailResult = await sendWelcome(plugin, email, locale).catch((err) => {
    logger.error(`[${plugin}/subscribe] welcome email threw`, { error: String(err) });
    return { success: false, error: String(err) };
  });
  if (!emailResult.success) {
    logger.error(`[${plugin}/subscribe] welcome email failed — download link not delivered`, { error: emailResult.error });
    return apiError("We couldn't send the download email. Please try again shortly.", {
      code: "EMAIL_DELIVERY_FAILED",
      status: 502,
    });
  }

  return apiSuccess({ subscribed: true });
}
