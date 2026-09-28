import { randomUUID } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { masterchainPurchases, masterchainTrials, type MasterchainTrial } from "@/db/schema";
import { verifiedEmailsOf } from "@/lib/plugins/portal";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { emailService } from "@/lib/services/email.service";
import { EULA_VERSION } from "@/lib/legal/eula";
import { logger } from "@/lib/utils/logger";
import { MASTERCHAIN_TRIAL_LIVE, MASTERCHAIN_TRIAL_DAYS } from "./config";
import { canonicalEmail, isDisposableEmail, issueKey, KeyIssuanceError, trialExpiry } from "./key-issuance";
import { LICENSE_VERSION } from "./license";

const consentSchema = z.object({ eulaAccepted: z.literal(true), eulaVersion: z.literal(EULA_VERSION) });
const bodySchema = consentSchema.extend({
  marketingOptIn: z.boolean().optional(),
  firstTouch: z.record(z.unknown()).optional(),
});
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const errorResponse = (error: string, status: number) => NextResponse.json({ error }, { status });

function isUniqueViolation(error: unknown): boolean {
  // Drizzle wraps the PostgreSQL error in cause. Recovery must happen AFTER tx rollback.
  if (!error || typeof error !== "object") return false;
  return ("code" in error && error.code === "23505") ||
    ("cause" in error && isUniqueViolation(error.cause));
}

export async function handleMasterchainTrial(request: Request) {
  if (!MASTERCHAIN_TRIAL_LIVE) return errorResponse("not_available", 404);

  try {
    const user = await currentUser();
    if (!user) return errorResponse("unauthorized", 401);
    const emails = verifiedEmailsOf(user);
    if (!emails.length) return errorResponse("no_verified_email", 403);
    const primary = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
    const primaryEmail = primary?.emailAddress.trim().toLowerCase();
    const email = primary?.verification?.status === "verified" && primaryEmail && emails.includes(primaryEmail)
      ? primaryEmail : emails[0];

    const body: unknown = await request.json().catch(() => null);
    if (!consentSchema.safeParse(body).success) return errorResponse("eula_required", 400);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return errorResponse("invalid_request", 400);

    const limit = await checkRateLimit("masterchain-trial", user.id);
    if (limit && !limit.success) return errorResponse("rate_limited", 429);
    if (isDisposableEmail(email)) return errorResponse("disposable_email", 422);

    const [purchase] = await db.select({ id: masterchainPurchases.id }).from(masterchainPurchases)
      .where(inArray(masterchainPurchases.email, emails)).limit(1);
    if (purchase) return errorResponse("already_purchased", 409);

    const emailCanonical = canonicalEmail(email);
    const lookup = (tx: Tx) => tx.select().from(masterchainTrials).where(or(
      eq(masterchainTrials.clerkUserId, user.id),
      eq(masterchainTrials.emailCanonical, emailCanonical),
    )).for("update");
    const existingResult = (rows: MasterchainTrial[]) => {
      // Canonical addresses deduplicate only. Neither canonical matching nor a Clerk id alone
      // grants ownership: the original license owner must still be a verified address.
      const row = rows.find((r) => r.clerkUserId === user.id);
      if (!row || !emails.includes(row.email) || rows.some((r) => r.clerkUserId !== user.id)) {
        return null;
      }
      return row;
    };

    let result: { status: "issued" | "existing"; row: MasterchainTrial | null };
    try {
      result = await db.transaction(async (tx) => {
        const existing = await lookup(tx);
        if (existing.length) return { status: "existing" as const, row: existingResult(existing) };

        const now = new Date();
        const id = randomUUID();
        const expiresAt = trialExpiry(now, MASTERCHAIN_TRIAL_DAYS);
        const licenseKey = issueKey({ owner: email, order: `trial:${id}`, expiresAt });
        const [row] = await tx.insert(masterchainTrials).values({
          id, email, emailCanonical, clerkUserId: user.id, licenseKey,
          licenseVersion: LICENSE_VERSION, issuedAt: now, expiresAt: new Date(expiresAt),
          eulaVersion: parsed.data.eulaVersion, eulaAcceptedAt: now,
          marketingOptIn: parsed.data.marketingOptIn ?? false,
          firstTouch: parsed.data.firstTouch,
        }).returning();
        return { status: "issued" as const, row };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // A missing row cannot be locked. The unique constraints arbitrate concurrent first claims;
      // re-read the winner in a fresh transaction, never reuse the aborted transaction.
      result = await db.transaction(async (tx) => {
        const rows = await lookup(tx);
        if (!rows.length) throw error;
        return { status: "existing" as const, row: existingResult(rows) };
      });
    }

    if (!result.row) return errorResponse("trial_used", 409);
    const { row } = result;
    const expiresAt = trialExpiry(row.expiresAt, 0);
    if (result.status === "issued") {
      try {
        // The body has no locale field. Use the request's preferred language, otherwise English.
        const locale = /^ja\b/i.test(request.headers.get("accept-language") ?? "") ? "ja" : "en";
        const delivery = await emailService.sendMasterchainTrialDelivery(
          { email: row.email }, { locale, licenseKey: row.licenseKey, expiresAt },
        );
        if (!delivery.success) logger.error("[masterchain/trial] email delivery failed", { trialId: row.id });
      } catch {
        // The committed key remains recoverable. Do not log provider errors that may include it.
        logger.error("[masterchain/trial] email delivery failed", { trialId: row.id });
      }
    }
    return NextResponse.json({ status: result.status, licenseKey: row.licenseKey, expiresAt });
  } catch (error) {
    // Query errors may embed INSERT parameters, including the license. Log only a safe category.
    logger.error("[masterchain/trial] issuance failed", {
      reason: error instanceof KeyIssuanceError ? "signing_unavailable" : "internal_error",
    });
    return errorResponse(error instanceof KeyIssuanceError ? "signing_unavailable" : "internal_error", 500);
  }
}
