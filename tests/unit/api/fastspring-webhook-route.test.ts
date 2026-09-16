/**
 * Unit — /api/webhooks/fastspring route (the envelope layer).
 *
 * ## Why this file exists
 *
 * ★Until this file, `route.ts` was the only part of the paid-line chain with no test at all:
 * `lib/masterchain/*` had 85 tests across 6 files, and the route had 0. That is backwards, because
 * the route holds the one thing in the chain that has ★never been checked against reality — the
 * FastSpring envelope (`events: [...]`, `event.id`, `event.type`). `TODO(C1)` in the route and
 * `docs/paid-line/c1-fastspring-product-and-fulfillment-spec.md` both say so plainly: the parse was
 * written from documentation and has not been compared with a `.test.` storefront delivery.
 *
 * So the untested function was the one carrying the unconfirmed assumption. These tests pin the
 * envelope handling so that when the real payload finally arrives, the diff is visible instead of
 * silent.
 *
 * ## ★The behaviour this file exists to lock down: an unreadable event must not return 2xx
 *
 * The route previously did `logger.error(...); return;` when `event.id` could not be read, and then
 * fell through to `{ received: true }`. FastSpring reads a 2xx as delivered and ★does not redeliver.
 * So a shape mismatch produced: charge taken, no license issued, no `webhook_events` row, and
 * nothing red anywhere — the most expensive possible way to be wrong.
 *
 * ★A 500 is the honest answer: the assumption that broke is ours, and a 5xx keeps a retry window
 * open so the order survives long enough for us to fix the parse. A 4xx would blame the sender and
 * lose the order for good.
 *
 * ## ★A batch is not one event — and the first cut of this fix assumed it was
 *
 * ★Refusing to report success is only half of it. The first version threw straight out of the
 * event loop, which meant a batch of `[unreadable, paid order]` never reached the paid order — and
 * never would, because every redelivery meets the unreadable event first and aborts in the same
 * place. ★The tests here only covered `[readable, unreadable]`, so they were green.
 *
 * product課 found it in review. The lesson worth keeping is not "test both orders" but the reason
 * this one was easy to miss: ★we throw precisely BECAUSE the envelope shape is unconfirmed, and
 * then quietly assumed that same unconfirmed envelope carries one event. Each event is now
 * processed in its own try, failures are collected, and the 500 is decided after the loop.
 *
 * ## ★What these tests do NOT establish
 *
 * They pin OUR reading of the envelope. They cannot tell us whether that reading is ★correct —
 * only a real `.test.` storefront delivery can, and that is still blocked on activation. ★If the
 * real envelope turns out to differ, these tests will need to change with it: they are a record of
 * the current assumption, not evidence for it.
 *
 * The DB is a stub, deliberately: this repo's `DATABASE_URL` points at production, so exercising
 * the route for real would write purchase rows (the same reason `masterchain-order-handler.test.ts`
 * gives for stubbing its transaction).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockHeaderGet,
  mockVerify,
  mockHandleOrder,
  mockSelectLimit,
  mockLogError,
  mockLogInfo,
  mockLogWarn,
  txInserts,
  txUpdates,
  mockTransaction,
} = vi.hoisted(() => {
  const txInserts: unknown[] = [];
  const txUpdates: unknown[] = [];
  const tx = {
    insert: () => ({
      values: (v: unknown) => {
        txInserts.push(v);
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (v: unknown) => ({
        where: () => {
          txUpdates.push(v);
          return Promise.resolve();
        },
      }),
    }),
  };
  return {
    mockHeaderGet: vi.fn(() => "sig"),
    mockVerify: vi.fn(() => true),
    mockHandleOrder: vi.fn(() => Promise.resolve("ok")),
    mockSelectLimit: vi.fn(() => Promise.resolve([])),
    mockLogError: vi.fn(),
    mockLogInfo: vi.fn(),
    mockLogWarn: vi.fn(),
    txInserts,
    txUpdates,
    mockTransaction: vi.fn((cb: (t: typeof tx) => Promise<void>) => cb(tx)),
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: mockHeaderGet }) }));
vi.mock("@/lib/utils/logger", () => ({
  logger: { error: mockLogError, warn: mockLogWarn, info: mockLogInfo, debug: vi.fn() },
}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectLimit }) }) }),
    transaction: mockTransaction,
  },
}));
vi.mock("@/db/schema", () => ({ webhookEvents: { eventId: "event_id" } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn((a, b) => ({ a, b })) }));
vi.mock("@/lib/masterchain/fastspring-signature", () => ({
  verifyFastspringSignature: mockVerify,
  FASTSPRING_SIGNATURE_HEADER: "x-fs-signature",
}));
vi.mock("@/lib/masterchain/fastspring-webhook", () => ({
  handleFastspringOrderCompleted: mockHandleOrder,
}));

import { GET, POST, SKIPPED_TEST_MARKER } from "@/app/api/webhooks/fastspring/route";

/** Minimal Request stand-in — the route only calls `request.text()`. */
const req = (body: unknown) =>
  ({ text: async () => (typeof body === "string" ? body : JSON.stringify(body)) }) as never;

// ★`live: true` は 2026-09-16 に追加。以前の helper には `live` が無く、★それでも fulfillment が
// 走っていた（route が `live` を見ていなかったため）。★live/test 分岐を入れた時、この helper を
// 使う既存テスト4本が落ちた ——★落ちた場所がそのまま「fulfillment を要求しているテスト」の一覧で、
// ★それらの意図は「★本物の注文は履行される」だった。∴ ★helper 側で live を明示する。
const order = (id: string) => ({ id, type: "order.completed", live: true, data: { order: id } });
/** live/test 分岐用 —— `live` を差し替えられる形（欠損を作るため `undefined` も渡せる）。 */
const orderWithLive = (id: string, live: unknown) => {
  const e: Record<string, unknown> = { id, type: "order.completed", data: { order: id } };
  if (live !== undefined) e.live = live;
  return e;
};

beforeEach(() => {
  vi.clearAllMocks();
  txInserts.length = 0;
  txUpdates.length = 0;
  mockHeaderGet.mockReturnValue("sig");
  mockVerify.mockReturnValue(true);
  mockSelectLimit.mockResolvedValue([]);
  mockHandleOrder.mockResolvedValue("ok");
});

describe("GET — liveness", () => {
  it("answers ok without touching the DB", async () => {
    const res = await GET();
    expect(res).toMatchObject({ status: 200, body: { status: "ok" } });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("POST — the gate", () => {
  it("★rejects a bad signature with 401 and never reaches the DB", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(401);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });

  it("★fail-closed on a missing signature header (not just a wrong one)", async () => {
    mockHeaderGet.mockReturnValue(null);
    mockVerify.mockReturnValue(false);
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(401);
  });

  it("rejects a body that is not JSON with 400, after the signature passed", async () => {
    const res = await POST(req("not json"));
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("POST — the envelope (★our assumption, not a confirmed shape)", () => {
  it("processes every event in a batch", async () => {
    const res = await POST(req({ events: [order("e1"), order("e2")] }));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockHandleOrder).toHaveBeenCalledTimes(2);
  });

  it("falls back to treating the whole body as one event when there is no `events` array", async () => {
    const res = await POST(req(order("solo")));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(txInserts[0]).toMatchObject({ eventId: "solo", type: "order.completed" });
  });

  it("★an explicitly empty `events: []` is a 200 with nothing done — a judgement, not an oversight", async () => {
    // ★Pinned because the alternative reading is invisible otherwise. `extractEvents` falls back to
    // "the whole body is one event" only when `events` is absent or not an array; an actual empty
    // array means FastSpring said "no events", and answering 200 to that is correct. ★Without this
    // test, a later reader cannot tell whether that was decided or never considered — the same
    // reason the `type: "unknown"` behaviour below is pinned. (product課, review of #953.)
    const res = await POST(req({ events: [] }));
    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });

  it("records the event under source 'fastspring' before handing off", async () => {
    await POST(req({ events: [order("e1")] }));
    expect(txInserts[0]).toMatchObject({ eventId: "e1", source: "fastspring", status: "processing" });
    expect(txUpdates.at(-1)).toMatchObject({ status: "processed" });
  });
});

describe("POST — ★an unreadable event must not be reported as success", () => {
  it("★returns 500, NOT 200, when the event has no readable id", async () => {
    // ★The regression this file was written for. Before the fix this returned 200 and FastSpring,
    // reading that as delivered, would never redeliver the order.
    const res = await POST(req({ events: [{ type: "order.completed" }] }));
    expect(res.status).toBe(500);
    expect(res.status).not.toBe(200);
    expect(res.body).toMatchObject({ error: "processing failed" });
  });

  it("★does not issue a license, and does not record the event, for an unreadable one", async () => {
    await POST(req({ events: [{ type: "order.completed" }] }));
    expect(mockHandleOrder).not.toHaveBeenCalled();
    expect(txInserts).toHaveLength(0);
  });

  it("★treats a non-string id the same as a missing one", async () => {
    const res = await POST(req({ events: [{ id: 12345, type: "order.completed" }] }));
    expect(res.status).toBe(500);
  });

  it("★reports 500 but still processes the readable event — [readable, unreadable]", async () => {
    const res = await POST(req({ events: [order("good"), { type: "order.completed" }] }));
    expect(res.status).toBe(500);
    expect(txInserts.map((i) => (i as { eventId: string }).eventId)).toContain("good");
  });

  it("★★and in the OTHER order too — [unreadable, readable]. A paid order behind an unreadable one must not be lost", async () => {
    // ★The counterexample product課 found in review. The first cut of this fix threw straight out of
    // the loop, so this order left `good` unprocessed — and permanently, because the redelivery meets
    // the unreadable event first and aborts at the same place every time. The tests above missed it
    // because they only covered one direction. ★Both orders, or the pair proves nothing.
    const res = await POST(req({ events: [{ type: "order.completed" }, order("good")] }));
    expect(res.status).toBe(500);
    expect(txInserts.map((i) => (i as { eventId: string }).eventId)).toContain("good");
    expect(mockHandleOrder).toHaveBeenCalledTimes(1);
  });

  it("★a failure in one event does not stop the ones after it either", async () => {
    mockHandleOrder.mockRejectedValueOnce(new Error("transient"));
    const res = await POST(req({ events: [order("a"), order("b")] }));
    expect(res.status).toBe(500);
    expect(mockHandleOrder).toHaveBeenCalledTimes(2);
  });

  it("★a handler failure is also a 500 — never a 2xx with the sale unrecorded", async () => {
    mockHandleOrder.mockRejectedValueOnce(new Error("no signing key"));
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(500);
  });
});

describe("POST — ★the refusal is the one chance to see the real envelope", () => {
  /** Every `shape:` argument the route logged, serialised. */
  const loggedShapes = () =>
    mockLogError.mock.calls
      .filter((c) => c[1] && typeof c[1] === "object" && "shape" in (c[1] as object))
      .map((c) => JSON.stringify(c[1]));

  it("★records the field NAMES when the id cannot be read", async () => {
    // ★Both refusals fire exactly when TODO(C1) is realised — the envelope is not what we assumed —
    // and that is the only moment the real shape is in our hands. The `id` refusal can never write a
    // row (the id IS the idempotency key), so a log is the only thing that can survive it.
    await POST(req({ events: [{ eventId: "wrong-key", data: { order: "x" } }] }));
    const shapes = loggedShapes();
    expect(shapes).toHaveLength(1);
    // The diagnosis this enables: "id is not at event.id — look, the field is called eventId".
    expect(shapes[0]).toContain("eventId");
    expect(shapes[0]).toContain("data");
  });

  it("★records the field NAMES when the type cannot be read, alongside the id", async () => {
    await POST(req({ events: [{ id: "e1", data: { type: "order.completed" } }] }));
    const shapes = loggedShapes();
    expect(shapes).toHaveLength(1);
    expect(shapes[0]).toContain('"eventId":"e1"');
    // ★The whole point: it shows `type` living one level down, without showing what it says.
    expect(shapes[0]).toContain("data");
  });

  it("★★logs the shape and NOT the values — a FastSpring order carries buyer email and country", async () => {
    // ★The property that actually matters. Field names are schema; values are someone's personal
    // data, and a log is not where those belong. (product課, review of #958.)
    await POST(
      req({
        events: [
          {
            id: "e2",
            data: { customer: { email: "buyer@example.com", country: "JP" }, total: 6900 },
          },
        ],
      }),
    );
    const dump = loggedShapes().join(" ");
    expect(dump).toContain("customer"); // ★name kept — enough to say "the buyer block is here"
    expect(dump).not.toContain("buyer@example.com"); // ★★value gone
    expect(dump).not.toContain("JP");
    expect(dump).not.toContain("6900");
    // ★Depth 2 stops at `customer`, so `email` is not even named. That is the depth the diagnosis
    // needs — `type` living at `event.data.type` is two levels — and going deeper would name more
    // fields for no diagnostic gain. ★The first draft of this test asserted `email` was named,
    // which would have argued for depth 3; the assertion was wrong, not the depth.
    expect(dump).not.toContain("email");
  });

  it("★★says so when the key cap fires — a silent cap makes 40 keys and 80 keys identical", async () => {
    // ★The failure points the same way as the purpose: this log exists to reveal an envelope bigger
    // or different than we assumed, so the further it deviates the likelier the cap hides it.
    // Same shape as `gh --json files` returning exactly 100 and meaning "at least 100".
    // (product課, review of #959 — measured: before this, 40 and 80 keys produced byte-identical output.)
    const wide = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k${i}`, "v"]));
    await POST(req({ events: [{ ...wide }] })); // no id → refusal path
    const dump = loggedShapes().join(" ");
    expect(dump).toContain("+40 more keys");
  });

  it("★does NOT claim truncation when nothing was cut", async () => {
    // ★Negative control: a marker that always appears says as little as one that never does.
    const narrow = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`k${i}`, "v"]));
    await POST(req({ events: [{ ...narrow }] }));
    expect(loggedShapes().join(" ")).not.toContain("more keys");
  });

  it("★a normal event logs no shape at all — this is a refusal path, not tracing", async () => {
    await POST(req({ events: [order("ok")] }));
    expect(loggedShapes()).toHaveLength(0);
  });
});

describe("POST — idempotency and routing", () => {
  it("skips an event already marked processed, without re-issuing", async () => {
    mockSelectLimit.mockResolvedValue([{ eventId: "e1", status: "processed" }]);
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });

  it("retries an event left in 'processing' rather than inserting a duplicate", async () => {
    mockSelectLimit.mockResolvedValue([{ eventId: "e1", status: "processing" }]);
    await POST(req({ events: [order("e1")] }));
    expect(txInserts).toHaveLength(0);
    expect(txUpdates[0]).toMatchObject({ status: "processing", errorMessage: null });
  });

  it("★records a non-order event but does not issue a license (routine skip, not an error)", async () => {
    const res = await POST(req({ events: [{ id: "e9", type: "subscription.charge.completed" }] }));
    expect(res.status).toBe(200);
    expect(mockHandleOrder).not.toHaveBeenCalled();
    expect(txInserts[0]).toMatchObject({ eventId: "e9", type: "subscription.charge.completed" });
    expect(txUpdates.at(-1)).toMatchObject({ status: "processed" });
  });

  it("★an event whose type is unreadable is NOT recorded as processed — it is a 500", async () => {
    // ★This used to record `type: "unknown"` and finish with `status: "processed"`. That row does not
    // merely fail to help — it asserts success (indistinguishable from a fulfilled order) and the
    // idempotency guard then refuses the redelivery, sealing an `order.completed` we could not read.
    // ★"A record exists" and "a repair path is open" are different things.
    const res = await POST(req({ events: [{ id: "e10" }] }));
    expect(res.status).toBe(500);
    expect(txInserts).toHaveLength(0);
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });

  it("★an UNKNOWN event type is still a routine skip — this is not a catch-all for new types", async () => {
    // ★The distinction the change above turns on: a new FastSpring event arrives as a readable
    // string and simply is not `order.completed`. Only a non-string `type` means "the envelope is
    // not the shape we assumed". Without this test the two are easy to conflate on the next read.
    const res = await POST(req({ events: [{ id: "e11", type: "subscription.deactivated" }] }));
    expect(res.status).toBe(200);
    expect(txInserts[0]).toMatchObject({ eventId: "e11", type: "subscription.deactivated" });
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });
});


describe("POST — ★live / test の分岐（テスト注文で本番ライセンスを出さない）", () => {
  // ★FastSpring は live と test を同一 endpoint へ送り、event の `live` boolean で出自を示す
  // （公式 doc reference/webhooks-overview.md: webhook は live / test / both を選べ、event は
  // `id` `type` `live` `processed` `created` `data` を持つ）。
  //
  // ★この分岐が無かった間、`.test.` storefront のテスト注文は ★本番の1件として処理された:
  // 本番の署名鍵で有効なライセンスを発行し、`masterchain_purchases` に INSERT し、実キー入りの
  // 配達メールを送る。★発行済みキーはオフライン検証ゆえ撤回できない（現行 binary には失効が効かない）。

  it("★live: true は履行する（陽性control — これが緑でないと以下の陰性は無意味）", async () => {
    const res = await POST(req({ events: [orderWithLive("live1", true)] }));
    expect(res.status).toBe(200);
    expect(mockHandleOrder).toHaveBeenCalledTimes(1);
    // ★live は従来どおり processed で終端する（★skip 側との対照）
    expect(txUpdates.at(-1)).toMatchObject({ status: "processed" });
  });

  it("★live: false は記録するが履行しない（200・license/INSERT/メールに到達しない）", async () => {
    const res = await POST(req({ events: [orderWithLive("test1", false)] }));
    expect(res.status).toBe(200);
    expect(mockHandleOrder).not.toHaveBeenCalled();
    // ★記録は残る — スキップするのは fulfillment だけで、観測性は落とさない
    expect(txInserts).toHaveLength(1);
    expect(txInserts[0]).toMatchObject({
      eventId: "test1",
      type: "order.completed",
      source: "fastspring",
    });
    // ★`live` は payload の中に在る（webhook_events に live 列は無いため）
    expect((txInserts[0] as { payload: Record<string, unknown> }).payload).toMatchObject({
      live: false,
    });
    // ★`warn` であること —— ★`logger.info` は本番で no-op（`NODE_ENV === 'development'` 限定）。
    // ★2026-09-16 の実 test 注文で、★DB に行は在るのに runtime log が空だったことで判明した。
    expect(mockLogWarn).toHaveBeenCalledWith(
      "[fastspring] test event recorded, fulfillment skipped",
      expect.objectContaining({ eventId: "test1", live: false }),
    );
    expect(mockLogInfo).not.toHaveBeenCalled(); // ★info では出さない（本番で消えるから）
    // ★★終端の書き方を撃つ（CCO レビュー #1038 の指摘）。★これを撃たない限り「封をする/しない」は
    // test に固定されない —— ★旧実装（無条件 processed）でも緑になってしまう。
    const last = txUpdates.at(-1) as Record<string, unknown>;
    expect(last.status).not.toBe("processed"); // ★行が成功を主張しない
    expect(last.completedAt).toBeInstanceOf(Date); // ★但し「終端した」印は付く
    expect(last.errorMessage).toBe(SKIPPED_TEST_MARKER);
  });

  it("★`live` の欠損は test 側に倒す —— ★shape が未確認だから、発行しない側が安い", async () => {
    const res = await POST(req({ events: [orderWithLive("nolive", undefined)] }));
    expect(res.status).toBe(200);
    expect(mockHandleOrder).not.toHaveBeenCalled();
    expect(txInserts).toHaveLength(1); // ★記録は残る
    expect(mockLogWarn).toHaveBeenCalledWith(
      "[fastspring] test event recorded, fulfillment skipped",
      expect.objectContaining({ eventId: "nolive", live: null }),
    );
    // ★★ここが賭けの成立条件: ★読み違えた本物の注文は ★再配達で履行に到達できなければならない
    // ∴ ★`processed` で封をしない（冒頭の冪等 guard が弾くのは `processed` だけ）。
    expect((txUpdates.at(-1) as Record<string, unknown>).status).not.toBe("processed");
  });

  it("★意図的な skip は `status='processing' AND completed_at IS NOT NULL` で引ける（将来の stuck 監視が誤検知しない形）", async () => {
    await POST(req({ events: [orderWithLive("marker", false)] }));
    // ★insert は processing、★最終 update は status を触らず completedAt だけ付ける
    expect(txInserts[0]).toMatchObject({ status: "processing" });
    const last = txUpdates.at(-1) as Record<string, unknown>;
    expect("status" in last).toBe(false); // ★status を書き換えない ＝ processing のまま
    expect(last.completedAt).toBeInstanceOf(Date);
    // ★`failed` は使わない（本物の失敗と同じ棚に恒常ベースラインを乗せない）
    expect(last.status).not.toBe("failed");
  });

  it("★文字列の 'true' も履行しない（`=== true` で見る理由 — truthy では倒れない）", async () => {
    const res = await POST(req({ events: [orderWithLive("strlive", "true")] }));
    expect(res.status).toBe(200);
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });

  it("★batch に live と test が混ざっても、履行されるのは live だけ", async () => {
    const res = await POST(
      req({
        events: [
          orderWithLive("t", false),
          orderWithLive("l", true),
          orderWithLive("n", undefined),
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(3); // ★3件すべて記録される
    expect(mockHandleOrder).toHaveBeenCalledTimes(1); // ★履行は live の1件だけ
  });

  it("★test event はスキップされても shape log を出さない（refusal path ではない）", async () => {
    await POST(req({ events: [orderWithLive("test2", false)] }));
    expect(mockLogError).not.toHaveBeenCalled();
  });
});

describe("POST — ★parse できない order.completed は ★行を残して 500（封じない・payload を失わない）", () => {
  // ★CCO レビュー #1039 の指摘。★handler は tx の中で呼ばれるので、★そこで throw すると
  // ★payload を持つ行まで rollback で消える。★route が `failed` で確定させ、★tx の外で throw する。

  it("★status を `failed` にして行を残し、★500 を返す", async () => {
    mockHandleOrder.mockResolvedValue("unparseable");
    const res = await POST(req({ events: [orderWithLive("bad1", true)] }));
    expect(res.status).toBe(500); // ★retry 窓は開く
    // ★行は insert 済で、★最終 update は `failed`（★`processed` ではない ＝ 冪等 guard が弾かない）
    expect(txInserts).toHaveLength(1);
    const last = txUpdates.at(-1) as Record<string, unknown>;
    expect(last.status).toBe("failed");
    expect(last.status).not.toBe("processed");
    expect(last.completedAt).toBeInstanceOf(Date);
    expect(String(last.errorMessage)).toMatch(/missing orderId\/email/);
  });

  it("★payload が行に残る（★これを失わないための変更）", async () => {
    mockHandleOrder.mockResolvedValue("unparseable");
    await POST(req({ events: [orderWithLive("bad2", true)] }));
    expect((txInserts[0] as { payload: Record<string, unknown> }).payload).toMatchObject({
      id: "bad2",
      type: "order.completed",
    });
  });

  it("★shape も log に出す（★id/type の拒否は出していて、★ここだけ欠けていた）", async () => {
    mockHandleOrder.mockResolvedValue("unparseable");
    await POST(req({ events: [orderWithLive("bad3", true)] }));
    expect(mockLogError).toHaveBeenCalledWith(
      expect.stringContaining("recording as failed"),
      expect.objectContaining({ eventId: "bad3", shape: expect.any(Object) }),
    );
  });

  it("★license / email の失敗は従来どおり throw で rollback（★行を残す対象ではない）", async () => {
    // ★売上行を作らずに retry させるのが正しいので、★そこは変えていない
    mockHandleOrder.mockRejectedValueOnce(new Error("cannot issue license"));
    const res = await POST(req({ events: [orderWithLive("boom", true)] }));
    expect(res.status).toBe(500);
  });
});
