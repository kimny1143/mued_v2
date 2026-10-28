//
// Shared email-gate subscribe handler for the MUEDsp free-download plugin family (案A / registry).
// Per-plugin routes share validation, rate limits, transactional delivery, and entitlement recording.
// MUEDsp news only with the form's checkbox (default off — kimny 2026-10-28 「B」); the download link always.
//
// Delivery is HONEST, not fake-open: the welcome email carries the download link (= the deliverable),
// so it is sent synchronously and its failure returns a non-200 (the UI shows a retry path instead of
// a false "sent"). The audience add (lead capture) is best-effort and does NOT fail the request — but
// a configured-but-failed add is logged + operator-alerted so a lead loss is visible.
// While staged (audience id unset) the audience add is a legitimate no-op (not treated as a failure).
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { rateLimit, checkRateLimit } from "@/lib/middleware/rate-limit";
import { addPluginSubscriber, isPluginAudienceEnabled } from "@/lib/plugins/audience";
import { alertAudienceAddFailed } from "@/lib/plugins/audience-alert";
import { recordPluginEntitlement } from "@/lib/plugins/entitlements";
import { emailService, type EmailResult } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { PLUGIN_DIST, HONEYPOT_FIELD, isHoneypotTripped, type PluginKey } from "@/lib/plugins/registry";

function schemaFor(plugin: PluginKey) {
  return z.object({
    email: z.string().email().transform((e) => e.toLowerCase().trim()),
    locale: z.enum(["ja", "en"]).default("en"),
    // The form's news checkbox. Only `true` is consent: missing, false or anything else is not.
    marketingOptIn: z.boolean().default(false),
    source: z.string().max(64).default(PLUGIN_DIST[plugin].source),
    utm_source: z.string().max(128).nullable().optional(),
    utm_medium: z.string().max(128).nullable().optional(),
    utm_campaign: z.string().max(128).nullable().optional(),
    utm_content: z.string().max(128).nullable().optional(),
    // Honeypot decoy — humans never fill it (hidden field). A non-empty value = bot; capped so a huge
    // paste can't itself be abused. Kept lenient (optional) so legit submits without the field pass.
    [HONEYPOT_FIELD]: z.string().max(200).optional(),
  });
}

// Per-plugin welcome email — kept as separate email-service methods so each plugin's copy is
// independent (MUEDsat's email is untouched by the MUEDlim add).
// ★Record<PluginKey, …> にしてある。if/else で書くと、4本目を足した人が else に落ちても
// tsc が通ってしまい、★別製品のメールが届く（2026-08-27 に muedrive で実際に起きかけた:
// 3値 union を2分岐で消費していて、muedrive が muedlim の else に落ちていた。product課 検出）。
// この形なら、キーを足し忘れた時点で tsc が止まる。
const WELCOME_SENDER: Record<
  PluginKey,
  (email: string, locale: "ja" | "en", marketingOptIn: boolean) => Promise<EmailResult>
> = {
  muedsat: (email, locale, marketingOptIn) => emailService.sendMuedsatDownloadWelcome({ email }, { locale, marketingOptIn }),
  muedlim: (email, locale, marketingOptIn) => emailService.sendMuedlimDownloadWelcome({ email }, { locale, marketingOptIn }),
  muedrive: (email, locale, marketingOptIn) => emailService.sendMuedriveDownloadWelcome({ email }, { locale, marketingOptIn }),
};

async function sendWelcome(plugin: PluginKey, email: string, locale: "ja" | "en", marketingOptIn: boolean) {
  return WELCOME_SENDER[plugin](email, locale, marketingOptIn);
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

  // Honeypot — a filled decoy field means a bot. SILENTLY no-op (same 200 shape as the not-live path)
  // so the bot can't distinguish a block from a success, and NO welcome email is sent (protects the
  // shared Resend send quota — the root vulnerability behind the 2026-07-16 launch-wave quota
  // exhaustion). Logged at warn (logger.info is a no-op in production — a real user caught here on
  // 2026-10-24 left no trace at all); never alerts. The response stays the same.
  if (isHoneypotTripped((parsed.data as Record<string, unknown>)[HONEYPOT_FIELD])) {
    logger.warn(`[${plugin}/subscribe] honeypot tripped — bot submit dropped (no email sent)`, { plugin });
    return apiSuccess({ subscribed: false });
  }

  // `source` is kept here (from P-1) for the portal entitlement record below.
  const { email, locale, source, marketingOptIn } = parsed.data;

  // Per-EMAIL rate limit (complements the IP-keyed bucket above). Caps welcome sends for a single
  // address so a retry-storm or single-address abuser can't burn the shared Resend send quota one
  // email at a time. Without Upstash, checkRateLimit enforces the same 5/hour in memory (per instance). A 429 here
  // surfaces as the form's generic "try again" error — honest (a real temporary limit), never a false
  // "sent". Generous window (5/hour) so a legit resend still works.
  // ★ Fail-open on ANY error, not just unconfigured. checkRateLimit only returns null when Upstash is
  // unconfigured; if `limiter.limit()` THROWS at runtime (network blip / Upstash-side 429 — precisely
  // the launch-wave high-load this PR defends), the throw would 500 the request and the welcome email
  // (= the deliverable) would never send. The IP-keyed rateLimit() wraps its own try/catch; this new
  // direct call must too, or it fail-CLOSES the exact scenario it protects (product課 review #687).
  const emailLimit = await checkRateLimit("plugin-email", `plugin-email:${email}`).catch(() => null);
  if (emailLimit && !emailLimit.success) {
    logger.warn(`[${plugin}/subscribe] per-email rate limit hit — welcome not resent`, { plugin });
    return apiError("You've requested this a few times recently. Please check your inbox and spam, then try again shortly.", {
      code: "RATE_LIMITED",
      status: 429,
    });
  }

  // Plugin closed to "coming soon" (registry.live = false, e.g. MUEDlim from 2026-07-13) — no-op the
  // capture so the email gate + download are fully disabled while closed. The UI form is already
  // hidden; this covers a stray direct POST. Live siblings (MUEDsat) are unaffected. Benign 200.
  if (!PLUGIN_DIST[plugin].live) {
    return apiSuccess({ subscribed: false });
  }

  // 1) Lead capture — add to the plugin's Resend audience only with the news checkbox ticked.
  //    Best-effort + no-op-safe while staged. A configured-but-failed add must be VISIBLE (logged +
  //    operator-alerted), never silent. It does NOT fail the request — the user still gets their
  //    download below, which is the honest thing to report.
  if (marketingOptIn === true) {
    const audienceConfigured = isPluginAudienceEnabled(plugin);
    const listCaptured = await addPluginSubscriber(plugin, { email, locale }).catch((err) => {
      logger.error(`[${plugin}/subscribe] audience add threw`, { error: String(err) });
      return false;
    });
    if (audienceConfigured && !listCaptured) {
      logger.error(`[${plugin}/subscribe] audience add failed — lead not captured to Resend`, { plugin });
      // Best-effort operator alert, at most once a day (every failure is in the log line above) — never blocks.
      void alertAudienceAddFailed(`${plugin}/subscribe`);
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
  const emailResult: EmailResult = await sendWelcome(plugin, email, locale, marketingOptIn).catch((err) => {
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

  // 3) Record the portal entitlement (P-1 — docs/portal/plan-brief-user-portal-20260717.md). The user
  //    just received their download link (about to 200), so record that this email owns this plugin →
  //    the portal (/dashboard/plugins) surfaces it + the latest version without an email re-fetch.
  //    BEST-EFFORT: it NEVER affects this response (the honest deliverable is the email above); the
  //    recorder swallows + logs its own errors, and the outer .catch guards against any unexpected
  //    throw. Idempotent (UNIQUE(email, plugin_key)); the P-3 audience backfill reconciles any loss.
  //    Attribution parity with 0050/0057: carry the submitted utm_* as first_touch when present (no
  //    gaClientId — the plugin subscribe schema doesn't parse one), else null (no empty-object noise).
  const firstTouch =
    parsed.data.utm_source || parsed.data.utm_medium || parsed.data.utm_campaign || parsed.data.utm_content
      ? {
          utmSource: parsed.data.utm_source ?? null,
          utmMedium: parsed.data.utm_medium ?? null,
          utmCampaign: parsed.data.utm_campaign ?? null,
          utmContent: parsed.data.utm_content ?? null,
        }
      : null;
  // ★`locale` is passed through (0061). It was already in scope here — destructured at the top of
  //   this function for the welcome email and the Resend audience — and simply not forwarded, so the
  //   landing-page surface a capture came from was recorded nowhere. That is the whole defect.
  await recordPluginEntitlement(plugin, { email, source, firstTouch, locale }).catch(() => {
    /* recordPluginEntitlement already logs + swallows — this is belt-and-suspenders, never blocks 200 */
  });

  return apiSuccess({ subscribed: true });
}
