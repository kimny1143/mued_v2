/**
 * "A subscriber did not reach the Resend list" emails the operator at most once a day (conductor 2026-10-27, (b)).
 *
 * After the marketing plan was cancelled the list is past the free tier's 1,000 contacts, so every sign-up fails
 * the add. One alert per sign-up would flood the inbox and spend the transactional quota. This runs the REAL rate
 * limiter in production mode with no Upstash — the in-memory path production is on — so the cap is the real one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendAdminAlert = vi.fn(async () => {});
vi.mock("@/lib/services/email.service", () => ({
  emailService: { isConfigured: () => true, sendAdminAlert: (...args: unknown[]) => sendAdminAlert(...(args as [])) },
}));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
  vi.resetModules();
  sendAdminAlert.mockClear();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("OPERATOR_ALERT_EMAIL", "ops@example.com");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T01:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("alertAudienceAddFailed", () => {
  it("sends one email for the first failure of the day, none for the next ones", async () => {
    const { alertAudienceAddFailed } = await import("@/lib/plugins/audience-alert");
    await alertAudienceAddFailed("muedlim/subscribe");
    await alertAudienceAddFailed("muedsat/subscribe");
    await alertAudienceAddFailed("muedvox-demo");
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
    expect(sendAdminAlert.mock.calls[0]).toEqual(["ops@example.com", expect.stringContaining("[muedlim/subscribe]")]);
    expect(sendAdminAlert.mock.calls[0]).toEqual(["ops@example.com", expect.stringContaining("at most once a day")]);
  });

  it("still sends nothing 23 hours later — the window is a day, not an hour", async () => {
    const { alertAudienceAddFailed } = await import("@/lib/plugins/audience-alert");
    await alertAudienceAddFailed("muedlim/subscribe");
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
    await alertAudienceAddFailed("muedlim/subscribe");
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
  });

  it("sends again once the day's window has passed", async () => {
    const { alertAudienceAddFailed } = await import("@/lib/plugins/audience-alert");
    await alertAudienceAddFailed("muedlim/subscribe");
    vi.setSystemTime(new Date("2026-10-29T01:00:01Z"));
    await alertAudienceAddFailed("muedlim/subscribe");
    expect(sendAdminAlert).toHaveBeenCalledTimes(2);
  });

  it("sends nothing without an operator address, and never throws when the send fails", async () => {
    const { alertAudienceAddFailed } = await import("@/lib/plugins/audience-alert");
    vi.stubEnv("OPERATOR_ALERT_EMAIL", "");
    await alertAudienceAddFailed("muedlim/subscribe");
    expect(sendAdminAlert).not.toHaveBeenCalled();
    vi.stubEnv("OPERATOR_ALERT_EMAIL", "ops@example.com");
    sendAdminAlert.mockRejectedValueOnce(new Error("quota"));
    await expect(alertAudienceAddFailed("muedlim/subscribe")).resolves.toBeUndefined();
  });
});
