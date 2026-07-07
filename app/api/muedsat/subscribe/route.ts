/**
 * MUEDsat free-download email gate — public capture endpoint.
 *
 *   POST /api/muedsat/subscribe  { email, locale?, source?, utm_* }  → adds the email to the
 *   MUEDsat Resend audience and (fail-open) sends the download-link email.
 *
 * Public / unauthenticated (a free-download gate — anyone can submit). Mirrors
 * app/api/research/waitlist/route.ts: zod validation + IP rate-limit + best-effort side effects.
 * "Your email is the price of the download, not the price of the plugin" — so submitting the form
 * IS the opt-in; the email is the source of truth for the list (no DB row, keeps this a pure add).
 *
 * Everything after validation is fail-open: a Resend outage (audience add or email) still returns
 * 200 so the UI shows success — the subscriber is never blocked by a downstream email failure, and
 * while staged (RESEND_MUEDSAT_AUDIENCE_ID unset) both side effects are silent no-ops.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiValidationError } from "@/lib/api-response";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { addMuedsatSubscriber } from "@/lib/muedsat/audience";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";

const schema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  locale: z.enum(["ja", "en"]).default("en"),
  source: z.string().max(64).default("muedsat_lp"),
  utm_source: z.string().max(128).nullable().optional(),
  utm_medium: z.string().max(128).nullable().optional(),
  utm_campaign: z.string().max(128).nullable().optional(),
  utm_content: z.string().max(128).nullable().optional(),
});

export async function POST(request: NextRequest) {
  // Reuse the "research" bucket (5 req/min/IP) — same shape of sensitive public submit.
  const rateLimitResponse = await rateLimit(request, "research");
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError("Invalid JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError("Validation failed", parsed.error.flatten());
  }

  const { email, locale } = parsed.data;

  // Add to the MUEDsat Resend audience — best-effort, no-op-safe while staged. Resend's
  // contacts.create is idempotent enough (a duplicate is caught inside addMuedsatSubscriber).
  await addMuedsatSubscriber({ email, locale }).catch((err) =>
    logger.error("[muedsat/subscribe] audience add failed", { error: String(err) })
  );

  // Send the download-link email — fail-open. Omits the link (says "on the way") until the dsp
  // package URL (MUEDSAT_DOWNLOAD_URL) is configured at unlock.
  if (emailService.isConfigured()) {
    emailService
      .sendMuedsatDownloadWelcome({ email }, { locale })
      .catch((err) =>
        logger.error("[muedsat/subscribe] welcome email failed", { error: String(err) })
      );
  }

  return apiSuccess({ subscribed: true });
}
