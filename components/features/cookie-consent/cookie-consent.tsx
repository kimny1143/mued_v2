"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  analyticsCookieNames,
  consentCookieString,
  consentLocale,
  expireCookieStrings,
  readConsent,
  type Consent,
} from "@/lib/analytics/consent";

export type CookieConsentCopy = {
  message: string;
  accept: string;
  essentialOnly: string;
  details: string;
  label: string;
};

type Props = {
  /** NEXT_PUBLIC_GA_MEASUREMENT_ID; when absent GA4 is never loaded, but the choice is still offered. */
  gaMeasurementId?: string;
  copy: { ja: CookieConsentCopy; en: CookieConsentCopy };
};

/** Expire every GA4 cookie (`_ga`, `_ga_*`) on this host and on the parent domain gtag.js writes to. */
function expireAnalyticsCookies() {
  for (const name of analyticsCookieNames(document.cookie)) {
    for (const expiry of expireCookieStrings(name, window.location.hostname)) document.cookie = expiry;
  }
}

/** Both choices wear exactly this — same border, same size, same weight — so neither reads as the "right" answer. */
export const CHOICE_BUTTON_CLASS =
  "rounded-md border border-white/25 px-3 py-1.5 text-center font-medium text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f5a524]";

/**
 * Cookie consent for every visitor + the only place gtag.js is loaded.
 * ★gtag.js is rendered ONLY when the stored choice is "all". Before a choice and after
 * "essential" it is never requested, so `_ga` is never set (lib/analytics/gtag.ts already
 * no-ops every event while window.gtag is undefined).
 */
export function CookieConsent({ gaMeasurementId, copy }: Props) {
  const pathname = usePathname() ?? "/";
  // undefined = not read yet (server render / first paint) → render nothing, avoiding a flash.
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const stored = readConsent(document.cookie);
    // ★Without "all", no GA4 cookie should exist. Old ones can: set before the 2026-10-08 banner, or re-written by a
    //   page that still had gtag.js when the visitor switched to 「必須のみ」. Clear them on every load, so the
    //   policy's 「同意された場合は」 holds by construction, not by the visitor having clicked on the right page.
    if (stored !== "all") expireAnalyticsCookies();
    setConsent(stored);
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const choose = (next: Consent) => {
    document.cookie = consentCookieString(next, window.location.protocol === "https:");
    if (next === "essential") {
      // Switching away from "all" on a page where gtag.js already ran: stop further hits and
      // remove the measurement cookies it set.
      if (gaMeasurementId) (window as unknown as Record<string, unknown>)[`ga-disable-${gaMeasurementId}`] = true;
      expireAnalyticsCookies();
    }
    if (next === "all" && gaMeasurementId) {
      // Back from "essential" on a page where gtag.js already ran ("all" → "essential" → "all"):
      // the init <Script> won't run again (next/script dedupes by id), so lift the disable flag and
      // re-send the config ourselves. On a page where gtag.js never loaded, rendering <Script> does it.
      const w = window as unknown as Record<string, unknown> & { gtag?: (...args: unknown[]) => void };
      if (w[`ga-disable-${gaMeasurementId}`] === true) {
        w[`ga-disable-${gaMeasurementId}`] = false;
        if (typeof w.gtag === "function") w.gtag("config", gaMeasurementId);
      }
    }
    setConsent(next);
    setReopened(false);
  };

  const locale = consentLocale(pathname, typeof document === "undefined" ? undefined : document.documentElement.lang);
  const t = copy[locale];
  const showBanner = consent === null || (consent !== undefined && reopened);

  return (
    <>
      {consent === "all" && gaMeasurementId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              var _gaDebug = new URLSearchParams(window.location.search).has('debug_mode');
              gtag('config', '${gaMeasurementId}', { debug_mode: _gaDebug });
            `}
          </Script>
        </>
      )}
      {showBanner && (
        <section
          role="region"
          aria-label={t.label}
          data-testid="cookie-consent"
          className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-white/10 bg-[#111113]/95 p-3 text-xs text-slate-300 shadow-lg backdrop-blur sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-sm"
        >
          <p className="leading-relaxed">
            {t.message}{" "}
            <a href={`/${locale}/privacy#cookies`} className="underline underline-offset-2 hover:text-white">
              {t.details}
            </a>
          </p>
          {/* ★Two equal choices (kimny 2026-10-08 「揃えましょう」): one class for both, and a two-column grid so the
              widths match whatever the labels are. Neither is filled — the amber fill stays the buy colour.
              Order is unchanged from before (essential, then accept): the difference was the fill, not the place. */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" data-testid="cookie-consent-essential" onClick={() => choose("essential")} className={CHOICE_BUTTON_CLASS}>
              {t.essentialOnly}
            </button>
            <button type="button" data-testid="cookie-consent-accept" onClick={() => choose("all")} className={CHOICE_BUTTON_CLASS}>
              {t.accept}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

/** Privacy page button: reopens the banner so the visitor can change the choice. */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-testid="cookie-settings-button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
      className="mt-3 rounded-md border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5"
    >
      {label}
    </button>
  );
}
