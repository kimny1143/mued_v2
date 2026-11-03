// Paid-product orders (masterchain, MUEDvox) placed by us, not by customers. Both products' orders live in
// `masterchain_purchases` (product_id 'muedsp_masterchain' | 'muedsp_vox').
//
// ★Today nothing counts orders or sales from `masterchain_purchases`, so nothing uses this list yet (the launch
// numbers count masterchain purchase emails from LAUNCH_AT, which is after the masterchain orders here —
// LAST_INTERNAL_ORDER_AT pins that). It is here for the count that comes later: that count must leave these out
// (tests/unit/masterchain-internal-orders.test.ts fails the day one is added under lib/funnel). The rows themselves
// stay as they are. The reconcile script matches fulfilment, not sales, so it keeps every order.
// (conductor 2026-10-01; the GA4 purchase event for each order below cannot be removed — conductor keeps a note
// in its ledger and subtracts it when reading GA4.)

export interface InternalOrder {
  /** masterchain_purchases.order_id (FastSpring's order id). */
  orderId: string;
  /** masterchain_purchases.product_id. */
  productId: "muedsp_masterchain" | "muedsp_vox";
  /** FastSpring's order reference, as shown in its admin — null when it is not on record here (our DB does not keep it). */
  reference: string | null;
  /** When the order completed (UTC). */
  orderedAt: string;
  note: string;
}

export const INTERNAL_ORDERS: readonly InternalOrder[] = [
  {
    orderId: "jrdPficIRayr15KZEyz0gg",
    productId: "muedsp_masterchain",
    reference: "GLASSWERKSJP260930-7382-30122",
    orderedAt: "2026-09-30T20:01:23Z",
    note:
      "kimny の確認購入（¥12,364・JP・ja）。本番の購入の経路（購入 → 鍵 → LICENSED）の確認。" +
      "10/1 kimny が全額返金を確定（返金の経路の本番の確認を兼ねる・return.created 2026-09-30T22:00:52Z・refunded_at が付いた）。",
  },
  {
    orderId: "k6D9k0AHQ6GhSBNat7KvFg",
    productId: "muedsp_vox",
    reference: null,
    orderedAt: "2026-10-13T13:56:41Z",
    note:
      "MUEDvox の試験購入（¥12,452・JP・EULA 2026.10.1）。kimny が 11/03 に試験購入と確認（conductor 経由）。" +
      "同じ日に全額返金（refund_kind full・return F0ygDpDTQB2vkOzt841tkg・refunded_at 2026-10-13T14:10:29Z）。" +
      "値は本番 DB の masterchain_purchases の行から（11/03 MUED が読んだ）。FastSpring の order reference は DB に無い。",
  },
];

export const INTERNAL_ORDER_IDS: readonly string[] = INTERNAL_ORDERS.map((o) => o.orderId);

/**
 * The latest internal MASTERCHAIN order time — the masterchain launch window (LAUNCH_AT) must start after it.
 * ★masterchain only: the launch numbers count masterchain purchase emails, so a MUEDvox test order (10/13) is
 * not in that window and must not move this date. ★Not an exclusion for order or sales counts: those leave
 * internal orders out by INTERNAL_ORDER_IDS (a date cut at 9/30 would still count the 10/13 vox test order).
 */
export const LAST_INTERNAL_ORDER_AT: string =
  INTERNAL_ORDERS.filter((o) => o.productId === "muedsp_masterchain").map((o) => o.orderedAt).sort().at(-1) ??
  "1970-01-01T00:00:00Z";
