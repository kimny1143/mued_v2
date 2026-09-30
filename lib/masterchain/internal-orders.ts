// masterchain orders placed by us, not by customers.
//
// ★Today nothing counts orders or sales from `masterchain_purchases`, so nothing uses this list yet (the launch
// numbers count purchase emails from LAUNCH_AT, which is after these orders — LAST_INTERNAL_ORDER_AT pins that).
// It is here for the count that comes later: that count must leave these out (tests/unit/masterchain-internal-
// orders.test.ts fails the day one is added under lib/funnel). The rows themselves stay as they are. The reconcile
// script matches fulfilment, not sales, so it keeps every order.
// (conductor 2026-10-01; the GA4 purchase event for the order below cannot be removed — conductor keeps a note
// in its ledger and subtracts it when reading GA4.)

export interface InternalOrder {
  /** masterchain_purchases.order_id (FastSpring's order id). */
  orderId: string;
  /** FastSpring's order reference, as shown in its admin. */
  reference: string;
  /** When the order completed (UTC). */
  orderedAt: string;
  note: string;
}

export const INTERNAL_ORDERS: readonly InternalOrder[] = [
  {
    orderId: "jrdPficIRayr15KZEyz0gg",
    reference: "GLASSWERKSJP260930-7382-30122",
    orderedAt: "2026-09-30T20:01:23Z",
    note:
      "kimny の確認購入（¥12,364・JP・ja）。本番の購入の経路（購入 → 鍵 → LICENSED）の確認。" +
      "10/1 kimny が全額返金を確定（返金の経路の本番の確認を兼ねる・return.created 2026-09-30T22:00:52Z・refunded_at が付いた）。",
  },
];

export const INTERNAL_ORDER_IDS: readonly string[] = INTERNAL_ORDERS.map((o) => o.orderId);

/** The latest internal order time — the launch window (LAUNCH_AT) must start after it. */
export const LAST_INTERNAL_ORDER_AT: string = INTERNAL_ORDERS.map((o) => o.orderedAt).sort().at(-1) ?? "1970-01-01T00:00:00Z";
