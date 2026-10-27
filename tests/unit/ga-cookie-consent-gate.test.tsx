/**
 * The GA identifier is read only with consent, and a GA4 cookie does not outlive a missing or withdrawn consent
 * (conductor 2026-10-27, after CCO's note on #1310). The privacy policy says purchases keep 「計測に同意された場合は
 * Google アナリティクスの識別子」; before this, the cart read `_ga` whenever the cookie existed — and one can exist
 * without consent: set before the 2026-10-08 banner, or left behind by a page that kept gtag.js after 「必須のみ」.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { CONSENT_COOKIE } from "@/lib/analytics/consent";
import { readGaClientId } from "@/lib/dial/first-touch-client";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

vi.mock("next/navigation", () => ({ usePathname: () => "/ja/muedsp" }));
vi.mock("next/script", () => ({ default: () => null }));

import { CookieConsent } from "@/components/features/cookie-consent/cookie-consent";

const copy = { ja: ja.cookieConsent, en: en.cookieConsent };
const GA_COOKIE = "_ga=GA1.1.123456789.1700000000";
const GA_STREAM_COOKIE = "_ga_TEST123=GS1.1.1700000000.1.0.1700000000.0.0.0";

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.trim().split("=")[0];
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}
const names = () => document.cookie.split(";").map((p) => p.trim().split("=")[0]).filter(Boolean);

beforeEach(() => {
  clearCookies();
  document.cookie = `${GA_COOKIE}; Path=/`;
  document.cookie = `${GA_STREAM_COOKIE}; Path=/`;
});

describe("readGaClientId — the purchase and dial first-touch read", () => {
  it("returns the id only when the stored choice is 'all'", () => {
    document.cookie = `${CONSENT_COOKIE}=all; Path=/`;
    expect(readGaClientId()).toBe("123456789.1700000000");
  });
  it.each([
    ["no choice yet (e.g. a cookie from before the banner)", null],
    ["'essential' (withdrawn)", "essential"],
  ])("returns nothing with %s, even though _ga exists", (_label, value) => {
    if (value) document.cookie = `${CONSENT_COOKIE}=${value}; Path=/`;
    expect(names()).toContain("_ga");
    expect(readGaClientId()).toBeUndefined();
  });
});

describe("<CookieConsent> on load", () => {
  it.each([
    ["no choice yet", null],
    ["'essential'", "essential"],
  ])("clears stale GA4 cookies with %s", (_label, value) => {
    if (value) document.cookie = `${CONSENT_COOKIE}=${value}; Path=/`;
    render(<CookieConsent gaMeasurementId="G-TEST123" copy={copy} />);
    expect(names()).not.toContain("_ga");
    expect(names()).not.toContain("_ga_TEST123");
  });
  it("leaves them alone with 'all'", () => {
    document.cookie = `${CONSENT_COOKIE}=all; Path=/`;
    render(<CookieConsent gaMeasurementId="G-TEST123" copy={copy} />);
    expect(names()).toEqual(expect.arrayContaining(["_ga", "_ga_TEST123"]));
  });
});
