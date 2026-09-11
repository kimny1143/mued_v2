/**
 * Unit — the unsubscribe page must not tell someone they are off a list they are still on.
 *
 * ## What CCO caught (review of #1002)
 *
 * #1002 made `unsubscribePluginContact` return `false` when Resend rejects the update. ★The route
 * discarded that value and returned `ok: true` unconditionally, so the page still rendered
 * 「配信を解除しました。今後、この配信は届きません。」 — ★the library became honest and the screen
 * did not. The sentence that PR's own comment condemns was still the one the person read.
 *
 * ★The `.catch()` in the old code never fired: the Resend SDK resolves `{data, error}` instead of
 * throwing, so it guarded a case that does not happen while the real failure walked past it. ★A
 * handler aimed at the wrong mechanism looks like error handling in review.
 *
 * ## Why this is a route test and not a copy test
 *
 * The defect is not the wording — it is that ★one wording was reachable in two different situations.
 * So these assertions are about which message each OUTCOME produces, and the one that matters is
 * negative: the failure page must contain no form of "you won't receive these anymore".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const unsubscribePluginContact = vi.fn();
vi.mock("@/lib/plugins/audience", () => ({ unsubscribePluginContact }));
vi.mock("@/lib/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
// ★The token is the capability; these tests are about what happens AFTER it verifies, so it is
//   stubbed per-case rather than signed for real (that path has its own test file).
const verifyUnsubscribeToken = vi.fn();
vi.mock("@/lib/plugins/unsubscribe-token", () => ({ verifyUnsubscribeToken }));

const URL_BASE = "https://mued.jp/api/plugins/unsubscribe?plugin=muedlim&email=a%40b.com&t=tok";

async function get(locale?: string) {
  const { GET } = await import("@/app/api/plugins/unsubscribe/route");
  const url = locale ? `${URL_BASE}&locale=${locale}` : URL_BASE;
  const res = await GET(new Request(url) as never);
  return { status: res.status, html: await res.text() };
}
async function post() {
  const { POST } = await import("@/app/api/plugins/unsubscribe/route");
  const res = await POST(new Request(URL_BASE, { method: "POST" }) as never);
  return res.status;
}

beforeEach(() => {
  vi.resetModules();
  verifyUnsubscribeToken.mockReturnValue(true);
});
afterEach(() => vi.clearAllMocks());

/** Every way the success sentence is spelled. The failure page must match none of them. */
const CLAIMS_DONE = [/今後、この配信は届きません/, /won't receive these emails anymore/i, /配信を解除しました/, /Unsubscribed/];

describe("unsubscribe page — suppression accepted", () => {
  it("says it is done", async () => {
    unsubscribePluginContact.mockResolvedValue(true);
    const { status, html } = await get();
    expect(status).toBe(200);
    expect(html).toMatch(/配信を解除しました/);
  });
});

describe("★★unsubscribe page — suppression REJECTED by Resend", () => {
  beforeEach(() => unsubscribePluginContact.mockResolvedValue(false));

  it("★★does not claim the person is off the list — in either locale", async () => {
    for (const locale of [undefined, "en"]) {
      const { html } = await get(locale);
      for (const claim of CLAIMS_DONE) {
        expect(html, `locale=${locale ?? "ja"} still claims success: ${claim}`).not.toMatch(claim);
      }
    }
  });

  it("★says they may still receive the emails, and names the way out", async () => {
    const ja = await get();
    expect(ja.html).toMatch(/配信が届く可能性/);
    expect(ja.html).toContain("support@mued.jp");
    const en = await get("en");
    expect(en.html).toMatch(/may still receive/i);
    expect(en.html).toContain("support@mued.jp");
  });

  it("★is still HTTP 200 — the link worked; it is the suppression that did not", async () => {
    // ★400 would say "your link was bad", which is a different and false statement.
    expect((await get()).status).toBe(200);
  });

  it("★POST stays 200 (RFC 8058) — a retry cannot fix a rejection", async () => {
    expect(await post()).toBe(200);
  });

  it("★a THROWN failure lands in the same place, not in silence", async () => {
    // ★`mockImplementationOnce` and not `mockRejectedValue`: the latter builds the rejected promise
    //   at setup time, so it is unhandled until the route happens to consume it — which vitest
    //   reports as the test's own failure and hides what is being tested.
    unsubscribePluginContact.mockImplementationOnce(async () => {
      throw new Error("network down");
    });
    const { status, html } = await get();
    expect(status).toBe(200);
    for (const claim of CLAIMS_DONE) expect(html).not.toMatch(claim);
  });
});

describe("unsubscribe page — invalid token", () => {
  it("is 400 and says the link is invalid, unchanged by this fix", async () => {
    verifyUnsubscribeToken.mockReturnValue(false);
    const { status, html } = await get();
    expect(status).toBe(400);
    expect(html).toMatch(/リンクが無効です/);
    // ★And the contact API is never called for a bad token — nothing is attempted.
    expect(unsubscribePluginContact).not.toHaveBeenCalled();
  });

  it("POST is 400 for a bad token", async () => {
    verifyUnsubscribeToken.mockReturnValue(false);
    expect(await post()).toBe(400);
  });
});
