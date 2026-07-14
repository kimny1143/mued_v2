//
// C2 — MUEDsp masterchain interest capture ("notify me at launch"), SEPARATE from the free-module
// download gate (no download link — this is a pre-launch announcement reservation, not a delivery).
//
// Records to a self-owned masterchain_interest row (the un-polluted 90-day denominator) + adds to a
// dedicated Resend interest audience. Per the #670 consent adjudication: the DB record is
// transactional/ALWAYS (it is a record, not a send), while the Resend add is the marketing opt-in —
// here the "notify me at launch" submission IS that opt-in. Staged behind MASTERCHAIN_INTEREST_LIVE:
// while false the route no-ops benignly (registered:false) so it ships inert before launch.
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { db } from "@/db";
import { masterchainInterest } from "@/db/schema";
import { firstTouchInputSchema, buildFirstTouch } from "@/lib/dial/first-touch";
import { addMasterchainContact, isMasterchainAudienceEnabled } from "@/lib/masterchain/audience";
import { MASTERCHAIN_INTEREST_LIVE } from "@/lib/masterchain/config";
import { logger } from "@/lib/utils/logger";

const schema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  locale: z.enum(["ja", "en"]).default("en"),
  source: z.string().max(64).default("muedsp_masterchain_s1"),
  firstTouch: firstTouchInputSchema, // gaClientId + utm* → channel-level attribution (dial shape)
});

export async function handleMasterchainInterest(request: NextRequest) {
  // Reuse the "research" bucket (5 req/min/IP) — same shape of sensitive public submit as the plugins.
  const limited = await rateLimit(request, "research");
  if (limited) return limited;

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

  const { email, locale, source } = parsed.data;

  // Staged (pre-launch): interest surface unpublished — benign no-op (route ships inert before launch).
  if (!MASTERCHAIN_INTEREST_LIVE) {
    return apiSuccess({ registered: false });
  }

  const firstTouch = buildFirstTouch(request.headers, parsed.data.firstTouch);

  // 1) Record the interest — transactional/ALWAYS (the self-owned denominator; a record, not a send),
  //    first-wins dedup on email. If this fails the interest isn't captured → honest retryable error.
  try {
    await db
      .insert(masterchainInterest)
      .values({ email, locale, source, firstTouch: firstTouch ?? undefined })
      .onConflictDoNothing({ target: masterchainInterest.email });
  } catch (err) {
    logger.error("[masterchain/interest] DB insert failed", { error: String(err) });
    return apiError("We couldn't register your interest. Please try again shortly.", {
      code: "INTEREST_RECORD_FAILED",
      status: 502,
    });
  }

  // 2) Add to the interest audience — best-effort + no-op-safe while unprovisioned. Submitting the
  //    "notify me at launch" form IS the marketing opt-in. A failure never surfaces to the caller.
  const audienceConfigured = isMasterchainAudienceEnabled("interest");
  const added = await addMasterchainContact("interest", { email, locale }).catch(() => false);
  if (audienceConfigured && !added) {
    logger.error("[masterchain/interest] audience add failed — lead not captured to Resend");
  }

  return apiSuccess({ registered: true });
}
