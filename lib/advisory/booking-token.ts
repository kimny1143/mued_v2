/**
 * Per-booking HMAC token for the operator's one-tap "mark conducted" email link.
 *
 * The booking-notify email (to kimny) carries a link to /api/advisory/booking/<id>/complete?t=<token>.
 * A raw admin key in that URL would leak into mail history / logs, so we sign the booking id with a
 * server-only secret instead: the token is specific to one booking and reveals nothing reusable.
 * verifyBookingToken recomputes and compares in constant time.
 *
 * The signing secret is ADVISORY_BOOKING_TOKEN_SECRET — deliberately SEPARATE from INTERNAL_API_KEY
 * (the KPI bearer), so a holder of the KPI key cannot forge a "conducted" token for a known booking id.
 */
import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return process.env.ADVISORY_BOOKING_TOKEN_SECRET ?? "";
}

/** hex HMAC-SHA256(bookingId) truncated to 32 chars — enough entropy for a per-booking capability. */
export function signBookingToken(bookingId: string): string {
  return createHmac("sha256", secret()).update(bookingId).digest("hex").slice(0, 32);
}

/** Constant-time verify. Returns false when the secret is unset or the token doesn't match. */
export function verifyBookingToken(bookingId: string, token: string | null | undefined): boolean {
  if (!secret() || !token) return false;
  const expected = signBookingToken(bookingId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
