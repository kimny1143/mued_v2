// C+ — FastSpring webhook (paid MUEDsp masterchain $69 reflux, design #670; pairs with the Stripe
// webhook for the dial rail). Public (no Clerk): /api/webhooks(.*) is public + matcher-excluded so
// the raw body is preserved for HMAC. Verify HMAC-SHA256 (fail-closed → 401) → parse the (batched)
// events → process each idempotently via the shared webhook_events table (source='fastspring').
//
// ★C1 確定（2026-09-16）— `.test.` storefront の実注文で envelope を突き合わせ、★想定と一致した:
//   payload = { events: [ { id, type, live, created, processed, data } ] }
//   `live` は ★top-level と `data.live` の両方に在り（どちらも boolean）、★我々は top-level を読む。
//   header `X-FS-Signature`（大小区別なし）/ HmacSHA256 / Base64 / raw body 全体 = 公式 doc どおり。
// ★出所: FastSpring 公式 `reference/webhooks-overview.md` + `reference/message-security.md`、
//   および order GLASSWERKSJP260916-5300-60118 の実受信（webhook_events の行で確認）。
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
import { handleFastspringOrderCompleted, handleFastspringReturnCreated } from "@/lib/masterchain/fastspring-webhook";

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
  // ★The batch is now CONFIRMED (C1, 2026-09-16): the real payload arrived as `events: [...]`.
  // ★We still process every event rather than assuming one, because that is the correct shape —
  // not merely a hedge against an unconfirmed one.
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

/** FastSpring batches events under `events`; fall back to a single-event body.
 *  ★C1 で確定（2026-09-16）: 公式 doc "Each POST … may contain multiple events in a single payload"
 *  ＋実注文の payload が `events: [...]` だった。★単一 body の fallback は保険として残す。 */
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

/** ★意図的な skip の marker。★`status` は pgEnum ゆえ専用値が置けないので `errorMessage` に入れる。
 *  ★test からも参照して、★文字列の取り違えで assert が空振りしないようにする。 */
export const SKIPPED_TEST_MARKER = "skipped: order.completed with live !== true";
/** return.created whose `data.completed` is not true: recorded, but the purchase row is not marked refunded. */
export const RETURN_NOT_COMPLETED_NOTE = "recorded only: return.created with completed !== true — purchase row not marked refunded";

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
    // ★The envelope is now confirmed (C1, 2026-09-16) — `id` / `type` / `live` all arrived where we
    // read them. ★This refusal stays: a confirmed shape is not a permanent one (FastSpring can change
    // it), and the cost asymmetry is unchanged — a throw makes the discovery a 500 and a retry window
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
    // same class as the id above (★confirmed 2026-09-16, but kept for the same asymmetry).
    logger.error("[fastspring] no readable type — the envelope is not the shape we assumed", {
      eventId,
      shape: envelopeShape(e),
    });
    throw new Error(
      `[fastspring] event ${eventId} has no readable type — refusing to record it as processed`,
    );
  }
  const type = e.type;

  // ★live/test の判定は ★fulfillment と ★終端の書き方の両方に効くので、ここで1度だけ決める。
  // ★`=== true` に倒す（`!== false` ではない）理由は下の分岐のコメントに書いた。
  // ★return.created follows the same rule: a test refund must not mark a real purchase refunded.
  const skippedTest = (type === "order.completed" || type === "return.created") && e.live !== true;

  const [existing] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, eventId))
    .limit(1);
  if (existing?.status === "processed") {
    logger.debug(`[fastspring] event ${eventId} already processed — skipping`);
    return;
  }

  // ★tx の外で throw するためのフラグ（★中で throw すると行が消える）。
  let unparseable = false;
  let noPurchase = false;
  let processedNote: string | null = null;

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
      // ── live / test の分岐 ────────────────────────────────────────────────────────────────────
      // FastSpring は live と test の通知を ★同一 endpoint へ送り、各 event の `live` boolean で
      // 出自を示す（公式 doc `reference/webhooks-overview.md`: webhook は live / test / both を
      // 選べ、event は `id` `type` `live` `processed` `created` `data` を持つ）。
      //
      // ★ここが無かった時、`.test.` storefront のテスト注文は ★本番の1件として処理された:
      // 本番の署名鍵で有効なライセンスを発行し、`masterchain_purchases` に実購入行を INSERT し、
      // 実キー入りの配達メールを送る。テストのたびに本物の資格情報が外へ出る。
      //
      // ★`=== true` で見るのは、★`live` の欠損を test 側に倒すため（`!== false` ではない）。
      // ★C1 で `live` の在り処は確定した（top-level・boolean）が、★欠損時に test 側へ倒す判断は
      // ★変えない。★欠損は「我々の読みが違う」可能性であり、その時に ★本番ライセンスを発行して
      // しまう方が、★テスト扱いで取り逃すより高くつく（発行済みキーは撤回できない — 
      // オフライン検証なので、出てしまえば現行 binary に対して失効が効かない）。
      // ★∴ 迷ったら発行しない側に倒す。
      //
      // 記録は残す: `webhook_events` の行は上で既に insert 済で、`payload` に event 全体
      // （`live` を含む）が入る。★スキップするのは fulfillment だけで、観測性は落とさない。
      if (skippedTest) {
        // ★`warn` であること —— ★`logger.info` は `NODE_ENV === 'development'` でしか出ない
        // （`lib/utils/logger.ts`）∴ ★本番では 1 行も残らなかった（2026-09-16 の test 注文で実測:
        // DB に行は在るのに runtime log は空）。★テスト注文が本番 webhook に届いたことは
        // ★運用側が見えるべき情報なので、★常時出る `warn` にする。
        logger.warn("[fastspring] test event recorded, fulfillment skipped", {
          eventId,
          live: e.live ?? null,
        });
      } else {
        // ★`"unparseable"` は ★throw させない（★CCO レビュー #1039）——★tx の中で throw すると
        // ★payload を持つ行まで rollback で消える。★行を `failed` で確定させ、★tx の外で throw する。
        // ★license / email の失敗は ★handler が throw し、★従来どおり tx 全体が rollback される
        // （★売上行を作らずに retry させるのが正しい）。
        if ((await handleFastspringOrderCompleted(tx, event)) === "unparseable") {
          unparseable = true;
          logger.error("[fastspring] order.completed missing orderId/email — recording as failed", {
            eventId,
            // ★行が残っても ★payload を人が読むのは手間 ∴ ★shape も log に出す（★値は出さない）。
            // ★id / type の拒否は既に出しているので、★ここだけ欠けていた（CCO 指摘）。
            shape: envelopeShape(e),
          });
        }
      }
    }

    if (type === "return.created" && !skippedTest) {
      // ★A refund marks the purchase row (never deletes it). "unparseable" is recorded as failed like
      //   order.completed, so a redelivery can still land once the shape is understood.
      const result = await handleFastspringReturnCreated(tx, event);
      if (result === "no_purchase") {
        // ★Kept as failed + 500 so FastSpring redelivers: a refund that beats order.completed must not be
        //   sealed as processed (CCO #1183 ②). A partial return on an already-refunded row lands here too;
        //   redelivery then finds the same state and FastSpring eventually stops — nothing is lost.
        unparseable = true;
        noPurchase = true;
      } else if (result === "not_completed") {
        // Recorded as processed (FastSpring need not resend it) with a note; the purchase row is untouched.
        processedNote = RETURN_NOT_COMPLETED_NOTE;
      } else if (result === "unparseable") {
        unparseable = true;
        logger.error("[fastspring] return.created missing return id / original order — recording as failed", {
          eventId,
          shape: envelopeShape(e),
        });
      }
    }

    if (unparseable) {
      // ★`failed` で確定 —— ★`processed` ではないので ★冪等 guard は弾かない ＝ 再配達で履行に
      // 到達できる。★かつ ★行（payload 付き）が残るので ★実 shape を後から読める。
      await tx
        .update(webhookEvents)
        .set({
          status: "failed",
          errorMessage: noPurchase
            ? "return.created: no unrefunded masterchain purchase row matched (order not written yet, or a partial return on an already refunded row) — left for redelivery"
            : type === "return.created"
              ? "return.created missing return id / original order — envelope not the shape we assumed"
              : "order.completed missing orderId/email — envelope not the shape we assumed",
          completedAt: new Date(),
        })
        .where(eq(webhookEvents.eventId, eventId));
    } else if (skippedTest) {
      // ★`processed` にしない —— ★ここが CCO レビュー（#1038）で塞いだ穴。
      //
      // ★旧実装は skip した後も無条件で `processed` を書いていた。★冒頭の冪等 guard は
      // `processed` を弾くので、★`live` を読み違えた本物の注文は ★封をされる: ライセンス無し・
      // 再配達も拒否・★行は緑。★これは this file が `type` の読めない場合について既に名指しして
      // 拒否している形そのもの（"A record exists" and "a repair path is open" are different things）。
      // ★自分で「shape が未確認」と認めている分岐で、★同じ誤りを繰り返していた。
      //
      // ★`status` は pgEnum（processing / processed / failed の3値）ゆえ専用値には migration が
      // 必要。★代わりに ★`completedAt` を「終端した」marker に使う: 両 route を実測したところ
      // `webhook_events` の `completedAt` は ★`processed` か `failed` と一緒にしか書かれていない
      // ∴ ★`status='processing' AND completed_at IS NOT NULL` は ★意図的な skip だけを指す
      // （★将来 stuck 監視を入れる時、★`completed_at IS NULL` で自然に除外できる）。
      //
      // ★`failed` は使わない —— ★意図どおりの skip を失敗として数えると、★stripe の本物の失敗と
      // 同じ棚に恒常的なベースラインが乗り、★本物の赤が埋もれる。
      await tx
        .update(webhookEvents)
        .set({
          completedAt: new Date(),
          errorMessage: SKIPPED_TEST_MARKER,
        })
        .where(eq(webhookEvents.eventId, eventId));
    } else {
      await tx
        .update(webhookEvents)
        .set({ status: "processed", completedAt: new Date(), ...(processedNote ? { errorMessage: processedNote } : {}) })
        .where(eq(webhookEvents.eventId, eventId));
    }
  });

  if (unparseable) {
    // ★tx は commit 済（行は `failed` で残っている）∴ ★ここで throw しても行は消えない。
    // ★throw は POST handler の catch に落ちて 500 になり、★FastSpring が再配達する。
    throw new Error(
      `[fastspring] event ${eventId}: ${
        noPurchase
          ? "return.created matched no unrefunded purchase row (not written yet, or partial on a refunded row)"
          : type === "return.created"
            ? "return.created missing return id / original order"
            : "order.completed missing orderId/email"
      } — refusing to report success`,
    );
  }
}
