/**
 * Server-side GA4 Measurement Protocol helper.
 * Fires events from webhook/API handlers where no browser context is available.
 * Fail-open: if env vars are missing, logs a warning and returns silently.
 */

const GA4_MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

interface GA4PurchaseParams {
  clientId: string;
  transactionId: string;
  value: number;
  currency: string;
  itemName: string;
  itemId: string;
}

export async function trackServerPurchase(params: GA4PurchaseParams): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_MP_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('[ga4-server] GA4_MP_API_SECRET or NEXT_PUBLIC_GA4_MEASUREMENT_ID not set — skipping purchase event');
    return;
  }

  const payload = {
    client_id: params.clientId,
    events: [
      {
        name: 'purchase',
        params: {
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
        },
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
