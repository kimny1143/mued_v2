/**
 * Unit — verifyFastspringSignature (lib/masterchain/fastspring-signature.ts).
 *
 * Locks the C+ gate: HMAC-SHA256 (base64) over the raw body, constant-time, and FAIL-CLOSED — an
 * unset secret or a missing/tampered signature returns false (→ 401), so nothing is processed until
 * FASTSPRING_WEBHOOK_SECRET is set in prod.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import {
  verifyFastspringSignature,
  isFastspringWebhookConfigured,
} from "@/lib/masterchain/fastspring-signature";

const OLD_ENV = { ...process.env };
const sign = (body: string, secret: string) =>
  createHmac("sha256", secret).update(body, "utf8").digest("base64");

beforeEach(() => {
  process.env.FASTSPRING_WEBHOOK_SECRET = "test-secret";
});
afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("verifyFastspringSignature", () => {
  it("accepts a correct HMAC-SHA256 base64 signature over the raw body", () => {
    const body = '{"events":[{"id":"e1","type":"order.completed"}]}';
    expect(verifyFastspringSignature(body, sign(body, "test-secret"))).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const body = '{"a":1}';
    expect(verifyFastspringSignature(body, sign(body, "wrong-secret"))).toBe(false);
  });

  it("rejects a tampered body (signature no longer matches)", () => {
    const good = sign('{"a":1}', "test-secret");
    expect(verifyFastspringSignature('{"a":2}', good)).toBe(false);
  });

  it("rejects a null / empty signature", () => {
    expect(verifyFastspringSignature('{"a":1}', null)).toBe(false);
    expect(verifyFastspringSignature('{"a":1}', undefined)).toBe(false);
    expect(verifyFastspringSignature('{"a":1}', "")).toBe(false);
  });

  it("fail-closed: with no secret, isConfigured=false and verify returns false", () => {
    delete process.env.FASTSPRING_WEBHOOK_SECRET;
    expect(isFastspringWebhookConfigured()).toBe(false);
    expect(verifyFastspringSignature('{"a":1}', "anything")).toBe(false);
  });
});
