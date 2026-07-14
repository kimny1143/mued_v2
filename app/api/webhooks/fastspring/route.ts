// C+ — FastSpring webhook (paid MUEDsp masterchain $69 reflux, design #670; pairs with the Stripe
// webhook for the dial rail). Public (no Clerk): /api/webhooks(.*) is public + matcher-excluded so
// the raw body is preserved for HMAC. Verify HMAC-SHA256 (fail-closed → 401) → parse the (batched)
// events → process each idempotently via the shared webhook_events table (source='fastspring').
//
// TODO(C1): the batch envelope + event id/type paths are the documented shape; confirm against a
// `.test.` storefront webhook (Kevin 審査後) and adjust extractEvents / the id/type reads.
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import {
  verifyFastspringSignature,
  FASTSPRING_SIGNATURE_HEADER,
} from "@/lib/masterchain/fastspring-signature";
import { handleFastspringOrderCompleted } from "@/lib/masterchain/fastspring-webhook";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "FastSpring webhook endpoint is running",
    endpoint: "/api/webhooks/fastspring",
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headersList = await headers();
  const signature = headersList.get(FASTSPRING_SIGNATURE_HEADER);

  // 1) HMAC verify — fail-closed (unset secret / bad signature → 401; nothing processed pre-go-live).
  if (!verifyFastspringSignature(rawBody, signature)) {
    logger.warn("[fastspring] invalid or missing signature — rejected");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // 2+3) process each (batched) event idempotently. A throw → 500 so FastSpring retries; the
  // already-processed events in the batch are skipped by the idempotency guard on retry.
  try {
    for (const event of extractEvents(payload)) {
      await processFastspringEvent(event);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("[fastspring] processing failed", { error: String(err) });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}

/** FastSpring batches events under `events`; fall back to a single-event body. TODO(C1): confirm. */
function extractEvents(payload: unknown): unknown[] {
  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return Array.isArray(p.events) ? p.events : [p];
}

async function processFastspringEvent(event: unknown): Promise<void> {
  const e = event && typeof event === "object" ? (event as Record<string, unknown>) : {};
  const eventId = typeof e.id === "string" ? e.id : undefined;
  const type = typeof e.type === "string" ? e.type : "unknown";
  if (!eventId) {
    logger.error("[fastspring] event missing id — skipped");
    return;
  }

  const [existing] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, eventId))
    .limit(1);
  if (existing?.status === "processed") {
    logger.debug(`[fastspring] event ${eventId} already processed — skipping`);
    return;
  }

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(webhookEvents)
        .set({ status: "processing", errorMessage: null })
        .where(eq(webhookEvents.eventId, eventId));
    } else {
      await tx.insert(webhookEvents).values({
        eventId,
        type,
        source: "fastspring",
        status: "processing",
        payload: e,
      });
    }

    if (type === "order.completed") {
      await handleFastspringOrderCompleted(tx, event);
    }

    await tx
      .update(webhookEvents)
      .set({ status: "processed", completedAt: new Date() })
      .where(eq(webhookEvents.eventId, eventId));
  });
}
