//
// FastSpring webhook HMAC-SHA256 signature verification (C+ / design #670).
//
// FastSpring signs the RAW webhook request body with HMAC-SHA256 (base64) using the store's webhook
// secret, and sends it in a request header. Same HMAC discipline as lib/advisory/booking-token.ts
// (createHmac + timingSafeEqual + a dedicated env secret), fail-CLOSED: an unset secret or a bad
// signature returns false (→ 401), so nothing is processed until FASTSPRING_WEBHOOK_SECRET is set.
//
// ★C1 確定（2026-09-16）— 公式 doc `reference/message-security.md` の逐語と一致:
//   header `X-FS-Signature`（★"not case-sensitive and might be sent with varying case" ——
//   Next.js の `headers()` は小文字に正規化するので下の定数でよい）/ `HmacSHA256` / `Base64` /
//   "the Raw Body of the request" 全体（★per-event ではない）/ secret は FastSpring App の
//   webhooks 配下「HMAC SHA256 Secret」1本（★live/test で別 secret という記述は無い）。
// ★実注文（GLASSWERKSJP260916-5300-60118・test mode）が 401 にならず処理された ＝ ★実測でも一致。
import { createHmac, timingSafeEqual } from "crypto";

/** Header carrying the FastSpring HMAC signature（★C1 で確定・公式 doc は `X-FS-Signature`）。 */
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
