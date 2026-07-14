/**
 * Pure builder for the GA4 `purchase` conversion event fired from the Stripe webhook for
 * MUEDial per-use (都度払い) payments — mix/mastering one-time purchases and additional retake
 * cycles.
 *
 * Why a pure module: the webhook handler is DB-bound and hard to unit-test, so the attribution
 * mapping (client_id + UTM inheritance, value from the real charge, item naming, skip-when-no-
 * client-id) lives here and is exercised directly. The handler just reads the session's persisted
 * first-touch, calls this, and — if non-null — fires trackServerPurchase() fail-open (never awaited,
 * never blocks fulfillment).
 *
 * Attribution source: `dialSessions.first_touch` (jsonb), captured first-wins at the user's first
 * /dial landing (see lib/dial/first-touch.ts). It already carries gaClientId + utm*, so no client
 * or checkout-metadata change is needed — the inheritance is entry → session → checkout → webhook.
 */

import type { GA4PurchaseParams } from "@/lib/analytics/ga4-server";

/** The attribution-relevant subset of the `first_touch` jsonb payload. */
export interface DialFirstTouchAttribution {
  gaClientId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface BuildDialPurchaseEventInput {
  /** The session's persisted first_touch jsonb (unknown/null-safe). */
  firstTouch: DialFirstTouchAttribution | null | undefined;
  /** Stripe `session.amount_total` — the real charged amount in the smallest currency unit. */
  amountTotalCents: number | null | undefined;
  /** Stripe `session.currency` (e.g. "usd"). */
  currency: string | null | undefined;
  /** Stable per-purchase id for GA4 dedup on webhook retry (use payment_intent). */
  transactionId: string;
  /** purchaseType / mixType / masteringType, or "additional_cycle". */
  purchaseLabel: string;
}

/** Human item names per purchase label; unknown labels fall back to a generic prefixed name. */
const ITEM_NAMES: Record<string, string> = {
  omakase: "MUEDial Omakase Mix",
  dialogue: "MUEDial Dialogue Mix",
  mastering: "MUEDial Mastering",
  omakase_mastering: "MUEDial Omakase + Mastering",
  mastering_dialogue: "MUEDial Dialogue + Mastering",
  additional_cycle: "MUEDial Additional Retake Cycle",
};

/**
 * Build a GA4 purchase event from a dial checkout + its persisted first-touch.
 * Returns `null` when there is no GA client_id (GA4 Measurement Protocol requires one) — the
 * caller then skips the event entirely (consistent with the subscription path's guard).
 */
export function buildDialPurchaseEvent(
  input: BuildDialPurchaseEventInput,
): GA4PurchaseParams | null {
  const ft = input.firstTouch;
  const gaClientId = ft?.gaClientId?.trim();
  if (!gaClientId) return null;

  const label = input.purchaseLabel?.trim() || "purchase";

  const utm = {
    source: ft?.utmSource,
    medium: ft?.utmMedium,
    campaign: ft?.utmCampaign,
    content: ft?.utmContent,
    term: ft?.utmTerm,
  };
  const hasUtm = Object.values(utm).some((v) => typeof v === "string" && v.length > 0);

  return {
    clientId: gaClientId,
    transactionId: input.transactionId,
    value: (input.amountTotalCents ?? 0) / 100,
    currency: (input.currency || "usd").toUpperCase(),
    itemName: ITEM_NAMES[label] ?? `MUEDial ${label}`,
    itemId: `dial_${label}`,
    utm: hasUtm ? utm : undefined,
  };
}
