/**
 * POST /api/advisory/booking — book the free 60-min 壁打ち (anonymous, zero operator work).
 *
 * Flow: validate (recording consent REQUIRED) → in ONE transaction insert the advisory_inquiries
 * row (type='booking', status='booked') and ATOMICALLY claim the chosen advisory_slots row
 * (claimAdvisorySlot); if the slot was just taken the claim matches 0 rows and the whole
 * transaction rolls back → 409-style validation error. The committed row is the source of truth for
 * the booking-count KPI (persist-first). Only AFTER commit do we send the .ics + Meet-link
 * confirmation to the booker and a notify (with a one-tap "mark conducted" link) to the operator —
 * both fail-open, because email is not the record.
 */
import { NextRequest, after } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisorySlots, advisoryInquiries } from "@/db/schema";
import { claimAdvisorySlot } from "@/lib/advisory/slot-reservation";
import { buildAdvisoryIcs } from "@/lib/advisory/ics";
import { signBookingToken } from "@/lib/advisory/booking-token";
import { emailService } from "@/lib/services/email.service";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { apiSuccess, apiValidationError, apiServerError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mued.jp";
const MEET_URL = process.env.ADVISORY_MEET_URL || "";
const NOTIFY_EMAIL = process.env.ADVISORY_NOTIFY_EMAIL || process.env.GLASSWERKS_INQUIRY_EMAIL || "";
const ORGANIZER_EMAIL = process.env.EMAIL_FROM_ADDRESS || "noreply@mued.jp";
const CONSENT_POLICY_VERSION = process.env.ADVISORY_CONSENT_POLICY_VERSION || "advisory-2026-07";

const schema = z.object({
  slotId: z.string().uuid(),
  name: z.string().max(100).optional(),
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  locale: z.enum(["ja", "en"]).default("ja"),
  // recording consent is REQUIRED for a booking (lane A). z.literal(true) rejects false/absent.
  recordingConsent: z.literal(true),
  source: z.string().max(100).optional(),
  utm_source: z.string().max(200).nullable().optional(),
  utm_medium: z.string().max(200).nullable().optional(),
  utm_campaign: z.string().max(200).nullable().optional(),
});

function formatDateTime(start: Date, locale: "ja" | "en"): string {
  const label = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    timeZone: "Asia/Tokyo",
    dateStyle: "full",
    timeStyle: "short",
  }).format(start);
  return locale === "ja" ? `${label}（日本時間）` : `${label} (JST)`;
}

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

  // The slot must currently be open (fast reject); the atomic claim below is the real race guard.
  const [slot] = await db
    .select()
    .from(advisorySlots)
    .where(and(eq(advisorySlots.id, input.slotId), eq(advisorySlots.status, "open")))
    .limit(1);
  if (!slot) return apiValidationError("This slot is no longer available");
  if (slot.startTime.getTime() <= Date.now()) return apiValidationError("This slot is in the past");

  let bookingId: string;
  try {
    bookingId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(advisoryInquiries)
        .values({
          type: "booking",
          status: "booked",
          name: input.name,
          email: input.email,
          locale: input.locale,
          slotId: slot.id,
          scheduledAt: slot.startTime,
          meetingUrl: MEET_URL || null,
          recordingConsent: true,
          consentPolicyVersion: CONSENT_POLICY_VERSION,
          consentLocale: input.locale,
          consentAt: new Date(),
          source: input.source,
          utmSource: input.utm_source ?? null,
          utmMedium: input.utm_medium ?? null,
          utmCampaign: input.utm_campaign ?? null,
        })
        .returning({ id: advisoryInquiries.id });

      // Atomic open→booked; 0 rows = the slot was just taken → roll back the whole booking.
      const claimed = await claimAdvisorySlot(tx, slot.id, row.id);
      if (!claimed) throw new Error("SLOT_TAKEN");
      return row.id;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return apiValidationError("This slot was just taken. Please choose another time.");
    }
    logger.error("[advisory/booking] transaction failed", { error: err, slotId: input.slotId });
    return apiServerError("Failed to create booking");
  }

  // persist-first done — the KPI row is committed. Send notifications in after() so Vercel keeps
  // the function alive to actually deliver them: a bare fire-and-forget promise can be dropped once
  // the response returns, which would silently lose the booker's confirmation + .ics (user-facing).
  const dateTimeLabel = formatDateTime(slot.startTime, input.locale);
  after(async () => {
    try {
      if (MEET_URL && emailService.isConfigured()) {
        const ics = buildAdvisoryIcs({
          uid: `${bookingId}@mued.jp`,
          start: slot.startTime,
          end: slot.endTime,
          summary: input.locale === "ja" ? "MUED 壁打ち (60分)" : "MUED consultation (60 min)",
          description:
            input.locale === "ja"
              ? `無料60分相談 / MUED advisory\nGoogle Meet: ${MEET_URL}`
              : `Free 60-min consultation / MUED advisory\nGoogle Meet: ${MEET_URL}`,
          location: MEET_URL,
          organizerName: "MUED",
          organizerEmail: ORGANIZER_EMAIL,
          attendeeName: input.name,
          attendeeEmail: input.email,
        });
        const icsBase64 = Buffer.from(ics, "utf8").toString("base64");
        await emailService.sendAdvisoryBookingConfirmed(
          { email: input.email, name: input.name },
          { name: input.name, locale: input.locale, dateTimeLabel, meetingUrl: MEET_URL, icsBase64 },
        );
      } else {
        logger.warn("[advisory/booking] confirm email skipped — ADVISORY_MEET_URL or Resend not configured", {
          bookingId,
        });
      }
      if (NOTIFY_EMAIL && emailService.isConfigured()) {
        const completeUrl = `${APP_URL}/api/advisory/booking/${bookingId}/complete?t=${signBookingToken(bookingId)}`;
        await emailService.sendAdvisoryBookingNotify(
          { email: NOTIFY_EMAIL },
          { name: input.name, email: input.email, dateTimeLabel, meetingUrl: MEET_URL, completeUrl },
        );
      }
    } catch (e) {
      logger.error("[advisory/booking] notification failed", { error: e, bookingId });
    }
  });

  return apiSuccess({
    bookingId,
    scheduledAt: slot.startTime.toISOString(),
    meetingUrl: MEET_URL || null,
  });
}
