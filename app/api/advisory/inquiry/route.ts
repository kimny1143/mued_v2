/**
 * POST /api/advisory/inquiry — lane B: "other questions" / paid-tier interest (human reply, no
 * booking, no recording). Clone of the waitlist route shape: rate-limit → zod → persist to the
 * single advisory_inquiries KPI store (type='inquiry') → notify operator + acknowledge inquirer
 * (both fail-open). Recording consent does not apply here (no session); an optional data-handling
 * consent flag is captured if the form sends it.
 */
import { NextRequest, after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { advisoryInquiries } from "@/db/schema";
import { emailService } from "@/lib/services/email.service";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { apiSuccess, apiValidationError, apiServerError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";

const NOTIFY_EMAIL = process.env.ADVISORY_NOTIFY_EMAIL || process.env.GLASSWERKS_INQUIRY_EMAIL || "";
const CONSENT_POLICY_VERSION = process.env.ADVISORY_CONSENT_POLICY_VERSION || "advisory-2026-07";

const schema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  locale: z.enum(["ja", "en"]).default("ja"),
  product: z.enum(["wallhit", "diagnosis", "build", "run", "other"]).nullable().optional(),
  message: z.string().max(2000).optional(),
  painPoint: z.string().max(1000).optional(), // pre-consult "biggest time-sink" answer (uniform KPI store)
  consent: z.boolean().optional(),
  source: z.string().max(100).optional(),
  utm_source: z.string().max(200).nullable().optional(),
  utm_medium: z.string().max(200).nullable().optional(),
  utm_campaign: z.string().max(200).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "strict");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError("Invalid JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiValidationError("Validation failed", parsed.error.flatten());
  const input = parsed.data;

  let inquiryId: string;
  try {
    const [row] = await db
      .insert(advisoryInquiries)
      .values({
        type: "inquiry",
        status: "new",
        name: input.name,
        email: input.email,
        locale: input.locale,
        product: input.product ?? null,
        message: input.message,
        painPoint: input.painPoint ?? null,
        recordingConsent: false,
        consentPolicyVersion: input.consent ? CONSENT_POLICY_VERSION : null,
        consentLocale: input.consent ? input.locale : null,
        consentAt: input.consent ? new Date() : null,
        source: input.source,
        utmSource: input.utm_source ?? null,
        utmMedium: input.utm_medium ?? null,
        utmCampaign: input.utm_campaign ?? null,
      })
      .returning({ id: advisoryInquiries.id });
    inquiryId = row.id;
  } catch (err) {
    logger.error("[advisory/inquiry] insert failed", { error: err });
    return apiServerError("Failed to submit inquiry");
  }

  // fail-open notifications in after() so serverless keeps the function alive to deliver them
  // (the committed row is the record).
  after(async () => {
    if (!emailService.isConfigured()) return;
    try {
      if (NOTIFY_EMAIL) {
        await emailService.sendAdvisoryInquiryNotify(
          { email: NOTIFY_EMAIL },
          { name: input.name, email: input.email, product: input.product ?? undefined, message: input.message },
        );
      }
      await emailService.sendAdvisoryInquiryConfirm(
        { email: input.email, name: input.name },
        { name: input.name, locale: input.locale },
      );
    } catch (e) {
      logger.error("[advisory/inquiry] notification failed", { error: e, inquiryId });
    }
  });

  return apiSuccess({ inquiryId });
}
