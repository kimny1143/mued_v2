/**
 * Server-side GA4 Measurement Protocol helper.
 * Fires events from webhook/API handlers where no browser context is available.
 * Fail-open: if env vars are missing, logs a warning and returns silently.
 */

const GA4_MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

/** UTM attribution carried from the session's first-touch onto the conversion event. */
export interface GA4UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface GA4PurchaseParams {
  clientId: string;
  transactionId: string;
  value: number;
  currency: string;
  itemName: string;
  itemId: string;
  /**
   * Optional UTM from the session's first-touch. Primary attribution is still GA4's
   * client_id session-stitch; these ride on the purchase event params so campaign/source
   * is directly queryable on the conversion even before stitch resolves.
   */
  utm?: GA4UtmParams;
}

export async function trackServerPurchase(params: GA4PurchaseParams): Promise<void> {
  // ★Must match the names that actually exist in production. This read said
  // NEXT_PUBLIC_GA4_MEASUREMENT_ID (with a "4") from 2026-05-09 until 2026-07-29; production only
  // ever had NEXT_PUBLIC_GA_MEASUREMENT_ID, so `measurementId` was undefined and every purchase
  // event returned here silently for 81 days. See tests/unit/analytics-env-names.test.ts.
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_MP_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('[ga4-server] GA4_MP_API_SECRET or NEXT_PUBLIC_GA_MEASUREMENT_ID not set — skipping purchase event');
    return;
  }

  const eventParams: Record<string, unknown> = {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        price: params.value,
        quantity: 1,
      },
    ],
  };

  // Attach UTM as event params (only the ones present) — entry→checkout→purchase inheritance.
  if (params.utm) {
    if (params.utm.source) eventParams.source = params.utm.source;
    if (params.utm.medium) eventParams.medium = params.utm.medium;
    if (params.utm.campaign) eventParams.campaign = params.utm.campaign;
    if (params.utm.content) eventParams.content = params.utm.content;
    if (params.utm.term) eventParams.term = params.utm.term;
  }

  const payload = {
    client_id: params.clientId,
    events: [
      {
        name: 'purchase',
        params: eventParams,
      },
    ],
  };

  try {
    await fetch(`${GA4_MP_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[ga4-server] Failed to send purchase event to GA4 MP:', err);
  }
}
