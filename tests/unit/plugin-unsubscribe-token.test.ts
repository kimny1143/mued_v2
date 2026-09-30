/**
 * Unit — plugin one-click-unsubscribe HMAC token (lib/plugins/unsubscribe-token.ts).
 * Verifies the signed capability round-trips and rejects mismatched plugin / email / tampered tokens.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/plugins/unsubscribe-token";

describe("plugin unsubscribe token", () => {
  beforeAll(() => {
    process.env.PLUGIN_UNSUBSCRIBE_TOKEN_SECRET = "test-secret-abc123";
  });

  it("signs a 32-char hex token and verifies it back", () => {
    const t = signUnsubscribeToken("muedlim", "a@b.com");
    expect(t).toMatch(/^[0-9a-f]{32}$/);
    expect(verifyUnsubscribeToken("muedlim", "a@b.com", t)).toBe(true);
  });

  it("is case/whitespace-insensitive on the email (matches the subscribe zod lowercasing)", () => {
    const t = signUnsubscribeToken("muedlim", "a@b.com");
    expect(verifyUnsubscribeToken("muedlim", "  A@B.CoM ", t)).toBe(true);
  });

  it("rejects a token minted for a different email", () => {
    const t = signUnsubscribeToken("muedlim", "a@b.com");
    expect(verifyUnsubscribeToken("muedlim", "c@d.com", t)).toBe(false);
  });

  it("rejects a token minted for a different plugin (no cross-plugin unsubscribe)", () => {
    const t = signUnsubscribeToken("muedlim", "a@b.com");
    expect(verifyUnsubscribeToken("muedsat", "a@b.com", t)).toBe(false);
  });

  it("rejects a tampered / empty / missing token", () => {
    const t = signUnsubscribeToken("muedsat", "a@b.com");
    expect(verifyUnsubscribeToken("muedsat", "a@b.com", t.slice(0, 31) + "0")).toBe(false);
    expect(verifyUnsubscribeToken("muedsat", "a@b.com", "")).toBe(false);
    expect(verifyUnsubscribeToken("muedsat", "a@b.com", null)).toBe(false);
    expect(verifyUnsubscribeToken("muedsat", "a@b.com", "short")).toBe(false);
  });

  it("is self-consistent even when the secret is unset (compliance before provisioning)", () => {
    const prev = process.env.PLUGIN_UNSUBSCRIBE_TOKEN_SECRET;
    delete process.env.PLUGIN_UNSUBSCRIBE_TOKEN_SECRET;
    const t = signUnsubscribeToken("muedlim", "a@b.com");
    expect(verifyUnsubscribeToken("muedlim", "a@b.com", t)).toBe(true);
    process.env.PLUGIN_UNSUBSCRIBE_TOKEN_SECRET = prev;
  });

  it("★a masterchain-scope token never verifies for a plugin scope (and vice versa)", () => {
    const t = signUnsubscribeToken("masterchain", "a@b.com");
    expect(verifyUnsubscribeToken("masterchain", "a@b.com", t)).toBe(true);
    expect(verifyUnsubscribeToken("muedsat", "a@b.com", t)).toBe(false);
    expect(verifyUnsubscribeToken("masterchain", "a@b.com", signUnsubscribeToken("muedsat", "a@b.com"))).toBe(false);
  });
});
