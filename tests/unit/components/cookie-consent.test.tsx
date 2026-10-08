/**
 * Cookie consent (kimny 2026-10-01 via conductor). The property under test is "gtag.js is requested
 * only after the visitor accepts" — measured on the rendered <Script src>, not on a flag.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONSENT_COOKIE,
  OPEN_COOKIE_SETTINGS_EVENT,
  analyticsCookieNames,
  consentCookieString,
  consentLocale,
  expireCookieStrings,
  readConsent,
} from "@/lib/analytics/consent";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

let pathname = "/ja/muedsp";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next/script", () => ({
  default: ({ src, id, children }: { src?: string; id?: string; children?: string }) => (
    <script data-testid="next-script" data-src={src} data-id={id}>
      {children}
    </script>
  ),
}));

import { CHOICE_BUTTON_CLASS, CookieConsent, CookieSettingsButton } from "@/components/features/cookie-consent/cookie-consent";

const GA = "G-TEST123";
const copy = { ja: ja.cookieConsent, en: en.cookieConsent };

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.trim().split("=")[0];
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

const gtagScripts = () =>
  screen.queryAllByTestId("next-script").filter((s) => (s.getAttribute("data-src") ?? "").includes("googletagmanager.com/gtag/js"));

beforeEach(() => {
  clearCookies();
  pathname = "/ja/muedsp";
});

describe("lib/analytics/consent", () => {
  it("reads only the two known values", () => {
    expect(readConsent(`a=1; ${CONSENT_COOKIE}=all; b=2`)).toBe("all");
    expect(readConsent(`${CONSENT_COOKIE}=essential`)).toBe("essential");
    expect(readConsent(`${CONSENT_COOKIE}=yes`)).toBeNull();
    expect(readConsent("NEXT_LOCALE=ja")).toBeNull();
    expect(readConsent("")).toBeNull();
  });

  it("writes a one-year, site-wide cookie; Secure only on https", () => {
    expect(consentCookieString("all", true)).toBe(`${CONSENT_COOKIE}=all; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    expect(consentCookieString("essential", false)).not.toContain("Secure");
  });

  it("finds GA4's cookies and nothing else", () => {
    expect(analyticsCookieNames("_ga=GA1.1.x; _ga_ABC=GS1; NEXT_LOCALE=ja; _gat=1; __session=t")).toEqual(["_ga", "_ga_ABC"]);
  });

  it("expires on the host and on the parent domain gtag.js uses", () => {
    expect(expireCookieStrings("_ga", "mued.jp")).toEqual(["_ga=; Path=/; Max-Age=0", "_ga=; Path=/; Max-Age=0; Domain=.mued.jp"]);
    expect(expireCookieStrings("_ga", "localhost")).toEqual(["_ga=; Path=/; Max-Age=0"]);
  });

  it("picks the language from the URL first", () => {
    expect(consentLocale("/ja/muedsp", "en")).toBe("ja");
    expect(consentLocale("/en", "ja")).toBe("en");
    expect(consentLocale("/dashboard/plugins", "ja")).toBe("ja");
    expect(consentLocale("/dial", undefined)).toBe("en");
    expect(consentLocale("/japan", "en")).toBe("en");
  });
});

describe("<CookieConsent>", () => {
  it("before a choice: shows the banner and does NOT load gtag.js", () => {
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    expect(screen.getByTestId("cookie-consent")).toBeTruthy();
    expect(screen.getByText(ja.cookieConsent.accept)).toBeTruthy();
    expect(screen.getByText(ja.cookieConsent.essentialOnly)).toBeTruthy();
    expect(gtagScripts()).toHaveLength(0);
  });

  // kimny 2026-10-08 「揃えましょう」: neither choice may look like the main one. Same class string = same border,
  // fill, padding and weight; the two-column grid gives them the same width whatever the labels are.
  it.each([["/ja/muedsp"], ["/en/muedsp"]])("%s: the two choices are styled identically and sit in an equal two-column grid", (path) => {
    pathname = path;
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    const essential = screen.getByTestId("cookie-consent-essential");
    const accept = screen.getByTestId("cookie-consent-accept");
    expect(accept.className).toBe(essential.className);
    expect(accept.className).toBe(CHOICE_BUTTON_CLASS);
    expect(accept.className).not.toMatch(/bg-\[#f5a524\]|bg-\[var\(--accent\)\]/); // the amber fill is the buy colour
    const buttons = screen.getByTestId("cookie-consent").querySelectorAll("button");
    expect(buttons).toHaveLength(2); // nothing else in the banner competes with the two
    expect(essential.parentElement).toBe(accept.parentElement);
    expect(essential.parentElement?.className).toMatch(/\bgrid\b.*\bgrid-cols-2\b/);
  });

  it("accept → stores 'all', hides the banner, and loads gtag.js with the measurement id", () => {
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    fireEvent.click(screen.getByText(ja.cookieConsent.accept));
    expect(readConsent(document.cookie)).toBe("all");
    expect(screen.queryByTestId("cookie-consent")).toBeNull();
    expect(gtagScripts()).toHaveLength(1);
    expect(gtagScripts()[0].getAttribute("data-src")).toBe(`https://www.googletagmanager.com/gtag/js?id=${GA}`);
  });

  it("essential only → stores 'essential', hides the banner, never loads gtag.js", () => {
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    fireEvent.click(screen.getByText(ja.cookieConsent.essentialOnly));
    expect(readConsent(document.cookie)).toBe("essential");
    expect(screen.queryByTestId("cookie-consent")).toBeNull();
    expect(gtagScripts()).toHaveLength(0);
  });

  it("a stored 'all' loads gtag.js without asking again", () => {
    document.cookie = `${CONSENT_COOKIE}=all; Path=/`;
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    expect(screen.queryByTestId("cookie-consent")).toBeNull();
    expect(gtagScripts()).toHaveLength(1);
  });

  it("a stored 'essential' neither asks nor loads", () => {
    document.cookie = `${CONSENT_COOKIE}=essential; Path=/`;
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    expect(screen.queryByTestId("cookie-consent")).toBeNull();
    expect(gtagScripts()).toHaveLength(0);
  });

  it("without a measurement id, accepting still stores the choice but loads nothing", () => {
    render(<CookieConsent copy={copy} />);
    fireEvent.click(screen.getByText(ja.cookieConsent.accept));
    expect(readConsent(document.cookie)).toBe("all");
    expect(gtagScripts()).toHaveLength(0);
  });

  it("the privacy page button reopens it; switching to essential removes GA4's cookies and disables gtag", () => {
    document.cookie = `${CONSENT_COOKIE}=all; Path=/`;
    document.cookie = "_ga=GA1.1.123; Path=/";
    document.cookie = "_ga_TEST123=GS1.1; Path=/";
    render(
      <>
        <CookieConsent gaMeasurementId={GA} copy={copy} />
        <CookieSettingsButton label={ja.cookieConsent.settingsButton} />
      </>,
    );
    expect(screen.queryByTestId("cookie-consent")).toBeNull();
    fireEvent.click(screen.getByTestId("cookie-settings-button"));
    expect(screen.getByTestId("cookie-consent")).toBeTruthy();
    fireEvent.click(screen.getByText(ja.cookieConsent.essentialOnly));
    expect(readConsent(document.cookie)).toBe("essential");
    expect(analyticsCookieNames(document.cookie)).toEqual([]);
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA}`]).toBe(true);
    expect(gtagScripts()).toHaveLength(0);
  });

  it("all → essential → all on the same page lifts ga-disable and re-sends the config", () => {
    document.cookie = `${CONSENT_COOKIE}=all; Path=/`;
    const gtag = vi.fn();
    const w = window as unknown as Record<string, unknown>;
    w.gtag = gtag;
    render(
      <>
        <CookieConsent gaMeasurementId={GA} copy={copy} />
        <CookieSettingsButton label={ja.cookieConsent.settingsButton} />
      </>,
    );
    fireEvent.click(screen.getByTestId("cookie-settings-button"));
    fireEvent.click(screen.getByText(ja.cookieConsent.essentialOnly));
    expect(w[`ga-disable-${GA}`]).toBe(true);
    fireEvent.click(screen.getByTestId("cookie-settings-button"));
    fireEvent.click(screen.getByText(ja.cookieConsent.accept));
    expect(w[`ga-disable-${GA}`]).toBe(false);
    expect(gtag).toHaveBeenCalledWith("config", GA);
    delete w.gtag;
    delete w[`ga-disable-${GA}`];
  });

  it("the reopen event is the one the button sends", () => {
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    fireEvent.click(screen.getByText(ja.cookieConsent.accept));
    act(() => {
      window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
    });
    expect(screen.getByTestId("cookie-consent")).toBeTruthy();
  });

  it("speaks English on /en pages and links to that locale's privacy section", () => {
    pathname = "/en/muedlim";
    render(<CookieConsent gaMeasurementId={GA} copy={copy} />);
    expect(screen.getByText(en.cookieConsent.accept)).toBeTruthy();
    expect(screen.getByText(en.cookieConsent.details).getAttribute("href")).toBe("/en/privacy#cookies");
  });
});

describe("app/layout.tsx", () => {
  const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
  it("no longer loads gtag.js directly — only through <CookieConsent>", () => {
    expect(layout).not.toContain("googletagmanager.com");
    expect(layout).toContain("<CookieConsent");
  });
});

describe("privacy §6 matches the banner", () => {
  it.each([
    ["ja", ja.privacy.section6.description, "すべての訪問者に設定されます"],
    ["en", en.privacy.section6.description, "currently set for all visitors"],
  ])("%s: names the consent cookie and no longer says GA4 runs for everyone", (_l, text, stale) => {
    expect(text).toContain(CONSENT_COOKIE);
    expect(text).not.toContain(stale);
    // Vercel Analytics / Speed Insights load for everyone (app/layout.tsx) — §6 says so (conductor 10/1).
    expect(text).toContain("Vercel Web Analytics");
    expect(text).toContain("Speed Insights");
  });

  it.each([
    ["ja", ja.privacy.section9.optout, ja.cookieConsent.accept, ja.cookieConsent.essentialOnly],
    ["en", en.privacy.section9.optout, en.cookieConsent.accept, en.cookieConsent.essentialOnly],
  ])("%s: §9 says only consenting visitors are measured and how to stop, in the banner's own words", (_l, text, accept, essential) => {
    expect(text).toContain(accept);
    expect(text).toContain(essential);
  });
});
