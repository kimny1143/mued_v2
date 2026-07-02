/**
 * Advisory #8 — per-booking HMAC token for the operator's one-tap "mark conducted" link.
 * secret() reads ADVISORY_BOOKING_TOKEN_SECRET at call time, so setting it before the test bodies
 * run is enough.
 */
import { describe, it, expect } from "vitest";
import { signBookingToken, verifyBookingToken } from "@/lib/advisory/booking-token";

process.env.ADVISORY_BOOKING_TOKEN_SECRET = "test-booking-token-secret";

describe("booking-token", () => {
  it("signs a deterministic 32-hex token for a given id", () => {
    const t = signBookingToken("booking-1");
    expect(t).toMatch(/^[0-9a-f]{32}$/);
    expect(signBookingToken("booking-1")).toBe(t); // stable
  });

  it("produces different tokens for different booking ids", () => {
    expect(signBookingToken("a")).not.toBe(signBookingToken("b"));
  });

  it("verifies the matching token and rejects wrong id / wrong token / empty", () => {
    const t = signBookingToken("booking-1");
    expect(verifyBookingToken("booking-1", t)).toBe(true);
    expect(verifyBookingToken("booking-2", t)).toBe(false); // token bound to the id
    expect(verifyBookingToken("booking-1", "0".repeat(32))).toBe(false); // wrong token, same length
    expect(verifyBookingToken("booking-1", "short")).toBe(false); // length mismatch
    expect(verifyBookingToken("booking-1", null)).toBe(false);
    expect(verifyBookingToken("booking-1", "")).toBe(false);
  });
});
