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

  // 2+3) Process EVERY event, then report. Each event is its own transaction, so one failing must
  // not stop the ones behind it.
  //
  // ★Why per-event and not a single try around the loop (product課, review of #953): a batch can mix
  // an event we cannot read with a readable, PAID order. Aborting the loop leaves that order
  // unprocessed — and permanently so, because the redelivery meets the same unreadable event first
  // and aborts again at the same place. The first cut of this fix had exactly that bug, and the
  // tests missed it because they only covered the `[readable, unreadable]` order.
  //
  // ★The batch itself is an unconfirmed assumption (TODO(C1)), which is the same reason we refuse to
  // report success below. Assuming a batch holds one event would be trusting the shape we are, in
  // the very next branch, declining to trust.
  const failures: string[] = [];
  for (const event of extractEvents(payload)) {
    try {
      await processFastspringEvent(event);
    } catch (err) {
      failures.push(String(err));
      logger.error("[fastspring] event failed", { error: String(err) });
    }
  }

  if (failures.length > 0) {
    // ★Still not a 2xx — FastSpring must redeliver. Replaying the batch is safe: the events that DID
    // succeed are skipped by the idempotency guard, so only the failed ones are retried.
    logger.error("[fastspring] processing failed", { failed: failures.length });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

/** FastSpring batches events under `events`; fall back to a single-event body. TODO(C1): confirm. */
function extractEvents(payload: unknown): unknown[] {
  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return Array.isArray(p.events) ? p.events : [p];
}

/**
 * ★A value-free description of an envelope: field names and types, never contents.
 *
 * Both refusals below fire at exactly the moment `TODO(C1)` describes — the envelope is not the shape
 * we assumed — and ★that is the one moment the real shape is in our hands. Before this, nothing
 * survived it: the `type` refusal throws before the row that used to persist `payload`, and the `id`
 * refusal never had a row to write (the id IS the idempotency key). ★So the first live order to
 * discover our reading is wrong would prove it and leave nothing to correct it with.
 *
 * ★Shape, not payload, on purpose. A FastSpring order carries buyer email and country (see
 * `lib/masterchain/fastspring-webhook.ts`), and logs are not where those belong. ★The diagnosis does
 * not need them: to learn that `type` lives at `event.data.type` rather than `event.type`, the field
 * names are sufficient and the values contribute nothing. (product課, review of #958.)
 */
const MAX_KEYS = 40;

function envelopeShape(v: unknown, depth = 2): unknown {
  if (v === null) return "null";
  // ★`v[0]` is a sample of one. The `[N]` is what tells the reader so — "N items, one of them shown"
  // — and that is a second job it is doing: it was put there to say "this is an array". ★Shortening
  // it to `"array"` would look like dropping noise and would silently turn a sample into something a
  // reader takes for the whole. Keep the N. (product課, review of #959.)
  if (Array.isArray(v)) return depth > 0 ? [`array[${v.length}]`, envelopeShape(v[0], depth - 1)] : `array[${v.length}]`;
  if (typeof v !== "object") return typeof v;
  if (depth <= 0) return "object";
  // ★Capped: an unexpected shape could be enormous, and a log line nobody can read is its own failure.
  const all = Object.entries(v as Record<string, unknown>);
  const out: Record<string, unknown> = Object.fromEntries(
    all.slice(0, MAX_KEYS).map(([k, x]) => [k, envelopeShape(x, depth - 1)]),
  );
  // ★The cap has to say when it fired. Without this line, 40 keys and 80 keys produce byte-identical
  // output and the reader cannot tell one from the other — the same shape as `gh --json files`
  // returning exactly 100 and meaning "at least 100". ★It matters more here than in most places
  // because the failure points the same way as the purpose: this log exists to reveal an envelope
  // bigger or different than assumed, and the further it deviates, the likelier the cap hides it.
  // ★Only the fact of truncation is added — no extra keys, no values. (product課, review of #959.)
  if (all.length > MAX_KEYS) out["…"] = `+${all.length - MAX_KEYS} more keys`;
  return out;
}

async function processFastspringEvent(event: unknown): Promise<void> {
  const e = event && typeof event === "object" ? (event as Record<string, unknown>) : {};
  const eventId = typeof e.id === "string" ? e.id : undefined;
  if (!eventId) {
    // ★An event we cannot identify is not an event we processed. Returning here used to fall through
    // to `{ received: true }` — FastSpring reads a 2xx as delivered and never redelivers, so a paid
    // order would vanish with nothing red anywhere: charge taken, no license, no row, one log line.
    //
    // ★The envelope shape above is still unconfirmed against a real `.test.` storefront (TODO(C1)),
    // and that is precisely why this has to be loud. If our read of `id` is wrong, the FIRST live
    // order is the one that discovers it — a throw makes that discovery a 500 and a retry window
    // instead of a silent success.
    //
    // ★5xx rather than 4xx on purpose: the unconfirmed assumption is OURS, so this is our failure,
    // not a malformed request. A 4xx would both blame the sender and drop the order permanently.
    // (Throwing lands in the POST handler's catch, which logs and returns 500.)
    logger.error("[fastspring] no readable id — the envelope is not the shape we assumed", {
      shape: envelopeShape(e),
    });
    throw new Error("[fastspring] event has no readable id — refusing to report success");
  }

  if (typeof e.type !== "string") {
    // ★Same class as an unreadable id, and for a sharper reason than symmetry.
    //
    // This used to record the event as `type: "unknown"` and finish the transaction with
    // `status: "processed"`. ★That row is not a trace of a problem — it is a row that ASSERTS
    // success: nothing distinguishes it from a fulfilled order, and the idempotency guard skips
    // anything marked `processed`, so the redelivery is refused too. ★An `order.completed` whose
    // type we could not read would be sealed — no license, no retry, and a green-looking row.
    // "A record exists" and "a repair path is open" are different things. (product課, review of #953.)
    //
    // ★This does NOT catch unknown event types: a new FastSpring event arrives as a readable string
    // and simply fails `type === "order.completed"` below, which is the routine skip. Reaching here
    // means `type` is not a string at all — the envelope is not the shape we assumed, the same
    // unconfirmed-shape class as the id above (TODO(C1)).
    logger.error("[fastspring] no readable type — the envelope is not the shape we assumed", {
      eventId,
      shape: envelopeShape(e),
    });
    throw new Error(
      `[fastspring] event ${eventId} has no readable type — refusing to record it as processed`,
    );
  }
  const type = e.type;

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
