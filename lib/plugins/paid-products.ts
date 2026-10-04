/**
 * The paid products sold through FastSpring, keyed by our own name (docs/paid-line/c9-multi-product-paid-line-design.md).
 *
 * ★Why this exists: the order.completed webhook used to stamp EVERY order as masterchain
 *   (`productId: "muedsp_masterchain"`, scope "masterchain"). With a second paid product (MUEDvox,
 *   kimny 2026-10-03) that would hand a MUEDvox buyer a masterchain key — and a key cannot be revoked
 *   (offline verification). The webhook now looks the order's product up here, and an order for a
 *   product that is not here gets NO key (kimny 2026-10-04「鍵を出さず通知」).
 *
 * ★Data only — no secrets, no server imports — so the buy button can read it later (PR-C).
 */
export type PaidProductKey = "masterchain" | "muedvox";

export interface PaidProduct {
  key: PaidProductKey;
  enabled: boolean;
  displayName: string;
  keyFileName: string;
  /** FastSpring product path, as it arrives in `order.completed` `data.items[].product`.
   *  ★Measured, not assumed: every live order (2026-10-01, webhook_events) carried "muedsp-masterchain". */
  fastspringPath: string;
  /** masterchain_purchases.product_id — unchanged from before this table existed. */
  productId: string;
  /** License scope (license.ts format v2). The plugin checks it, so a key for one product cannot open another. */
  scope: string;
  /** GA4 purchase item name. */
  itemName: string;
}

export const PAID_PRODUCTS: Readonly<Record<PaidProductKey, PaidProduct>> = {
  masterchain: {
    key: "masterchain",
    enabled: true,
    displayName: "masterchain",
    keyFileName: "MUEDsp-masterchain.license.key",
    fastspringPath: "muedsp-masterchain",
    productId: "muedsp_masterchain",
    scope: "masterchain",
    itemName: "MUEDsp masterchain",
  },
  // Disabled until the launch PR (conductor 2026-10-04): enable → deploy → kimny publishes
  // the store; enabling early would sell a product whose download does not exist.
  muedvox: {
    key: "muedvox",
    fastspringPath: "muedsp-vox",
    productId: "muedsp_vox",
    scope: "muedvox",
    itemName: "MUEDvox",
    displayName: "MUEDvox",
    keyFileName: "MUEDvox.license.key",
    enabled: false,
  },
};

/** The paid product for a FastSpring product path, or null when we do not sell it (yet). */
export function paidProductByFastspringPath(path: string | undefined): PaidProduct | null {
  if (!path) return null;
  return Object.values(PAID_PRODUCTS).find((p) => p.enabled && p.fastspringPath === path) ?? null;
}

/** Recorded purchases render even when fulfillment is disabled. */
export function paidProductByProductId(productId: string): PaidProduct | null {
  return Object.values(PAID_PRODUCTS).find((p) => p.productId === productId) ?? null;
}
