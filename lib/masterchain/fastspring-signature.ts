//
// FastSpring webhook HMAC-SHA256 signature verification (C+ / design #670).
//
// FastSpring signs the RAW webhook request body with HMAC-SHA256 (base64) using the store's webhook
// secret, and sends it in a request header. Same HMAC discipline as lib/advisory/booking-token.ts
// (createHmac + timingSafeEqual + a dedicated env secret), fail-CLOSED: an unset secret or a bad
// signature returns false (→ 401), so nothing is processed until FASTSPRING_WEBHOOK_SECRET is set.
//
// TODO(C1): confirm the exact header NAME + encoding (base64 vs hex, whole-body vs per-event) against
// a `.test.` storefront order — FastSpring dashboard exposes both. Header/encoding below are the
// documented defaults; adjust once verified with a real test webhook (Kevin 審査後).
import { createHmac, timingSafeEqual } from "crypto";

/** Header carrying the FastSpring HMAC signature. TODO(C1): confirm against a test webhook. */
export const FASTSPRING_SIGNATURE_HEADER = "x-fs-signature";

function secret(): string {
  return process.env.FASTSPRING_WEBHOOK_SECRET ?? "";
}

/** True when the webhook secret is configured (verification will actually run). */
export function isFastspringWebhookConfigured(): boolean {
  return !!secret();
}

/**
 * Constant-time verify of a FastSpring webhook signature (HMAC-SHA256, base64) over the raw body.
 * Returns false (fail-closed) when the secret is unset or the signature is missing / doesn't match.
 */
export function verifyFastspringSignature(rawBody: string, signature: string | null | undefined): boolean {
  const s = secret();
  if (!s || !signature) return false;
  try {
    const expected = createHmac("sha256", s).update(rawBody, "utf8").digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
