/**
 * Cookie consent (kimny 2026-10-01 via conductor: show it to every visitor; GA4 stays).
 *
 * Two choices only:
 *   "all"       → Google Analytics 4 (gtag.js + its `_ga` cookies) is loaded
 *   "essential" → gtag.js is never loaded; only NEXT_LOCALE and Clerk's auth cookies exist
 * No choice yet (null) → gtag.js is NOT loaded either. Consent is opt-in, never assumed.
 *
 * The choice itself lives in a first-party cookie (not localStorage) so that it survives the
 * same things NEXT_LOCALE survives and can be cleared by the visitor with the rest of the site's
 * cookies. It is an essential cookie: it records the refusal, so it cannot itself need consent.
 */

export type Consent = "all" | "essential";

export const CONSENT_COOKIE = "mued_cookie_consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Fired on window by the privacy page's "change cookie settings" button → the banner reopens. */
export const OPEN_COOKIE_SETTINGS_EVENT = "mued:cookie-settings";

/** Parse the consent cookie out of a `document.cookie`-shaped string. Unknown values → null. */
export function readConsent(cookieString: string): Consent | null {
  for (const part of cookieString.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName !== CONSENT_COOKIE) continue;
    const value = rest.join("=");
    return value === "all" || value === "essential" ? value : null;
  }
  return null;
}

export function consentCookieString(consent: Consent, secure: boolean): string {
  return `${CONSENT_COOKIE}=${consent}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/**
 * Names of GA4's own cookies present in a `document.cookie`-shaped string: `_ga` and `_ga_<ID>`.
 * Used when someone switches from "all" to "essential", so the measurement cookies don't linger.
 */
export function analyticsCookieNames(cookieString: string): string[] {
  return cookieString
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
}

/**
 * Expiry strings that delete a cookie on the host and on its registrable parent domain
 * (gtag.js sets `_ga` with `domain=.mued.jp`, which a host-only expiry does not remove).
 */
export function expireCookieStrings(name: string, hostname: string): string[] {
  const base = `${name}=; Path=/; Max-Age=0`;
  const labels = hostname.split(".");
  const out = [base];
  if (labels.length >= 2) out.push(`${base}; Domain=.${labels.slice(-2).join(".")}`);
  return out;
}

/** The banner's language: the URL's /ja or /en prefix first, then <html lang>, else English. */
export function consentLocale(pathname: string, htmlLang: string | undefined): "ja" | "en" {
  if (pathname === "/ja" || pathname.startsWith("/ja/")) return "ja";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return htmlLang === "ja" ? "ja" : "en";
}
