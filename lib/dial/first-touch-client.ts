'use client';

/**
 * Client-side first-touch capture & forwarding for MUEDial.
 *
 * Captures acquisition attribution on the user's FIRST /dial landing and persists it to
 * localStorage (first-wins — never overwritten on later visits), then forwards it when a session
 * is created. This keeps the ORIGINAL referrer/utm for multi-step funnels
 * (e.g. Threads bio -> dial top -> readiness -> ... -> paid), where document.referrer would
 * otherwise be an internal same-site page by the time a session/checkout is created.
 *
 * All operations are best-effort and never throw — a measurement failure must never block a
 * checkout or payment flow.
 */
import type { FirstTouch } from './first-touch';
import { readConsent } from '@/lib/analytics/consent';

/** localStorage key holding the first-touch payload (first-wins, never overwritten). */
export const DIAL_FIRST_TOUCH_KEY = 'dial_first_touch';

const UTM_PARAM_MAP: Array<[string, keyof FirstTouch]> = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_content', 'utmContent'],
  ['utm_term', 'utmTerm'],
];

/**
 * GA4 client_id from the _ga cookie (format GA1.1.{id}.{ts} → "{id}.{ts}").
 *
 * ★Exported so the masterchain checkout can reuse it rather than re-deriving the cookie format.
 * The `_ga` layout is a fact about GA4, not about MUEDial — a second copy would be a second place
 * to be wrong, and the two copies could not disagree loudly (both would just return undefined).
 */
export function readGaClientId(): string | undefined {
  try {
    // ★Only with consent (privacy policy: 「計測に同意された場合は Google アナリティクスの識別子」). A `_ga` cookie can
    //   outlive the choice — set before the 2026-10-08 banner, or left by a page that kept gtag.js after 「必須のみ」 —
    //   so the cookie's presence is not consent. Purchases and dial sessions both read the id through here.
    if (readConsent(document.cookie) !== "all") return undefined;
    const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
    if (!match) return undefined;
    const parts = match[1].split('.');
    return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Capture first-touch attribution on the user's first /dial page view and persist it to
 * localStorage (FIRST-WINS — never overwritten). Forwarded to the server on session creation.
 * Best-effort: any failure (private mode / quota / no storage) is swallowed.
 */
export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(DIAL_FIRST_TOUCH_KEY)) return; // first-wins

    const params = new URLSearchParams(window.location.search);
    const ft: FirstTouch = {
      capturedAt: new Date().toISOString(),
      landingPath: window.location.pathname + window.location.search,
    };
    if (document.referrer) ft.referrer = document.referrer;
    for (const [param, key] of UTM_PARAM_MAP) {
      const v = params.get(param);
      if (v) (ft as Record<string, string>)[key] = v;
    }
    const ga = readGaClientId();
    if (ga) ft.gaClientId = ga;

    window.localStorage.setItem(DIAL_FIRST_TOUCH_KEY, JSON.stringify(ft));
  } catch {
    /* non-fatal: skip capture */
  }
}

/**
 * Read the persisted first-touch payload to forward on session creation, enriched with a fresh
 * GA4 client_id if one wasn't captured at first landing (GA may load after the first paint).
 * Returns undefined when nothing is known. Best-effort: never throws.
 */
export function getStoredFirstTouch(): FirstTouch | undefined {
  if (typeof window === 'undefined') return undefined;
  let ft: FirstTouch | undefined;
  try {
    const raw = window.localStorage.getItem(DIAL_FIRST_TOUCH_KEY);
    if (raw) ft = JSON.parse(raw) as FirstTouch;
  } catch {
    ft = undefined;
  }
  if (!ft?.gaClientId) {
    const ga = readGaClientId();
    if (ga) ft = { ...(ft ?? {}), gaClientId: ga };
  }
  return ft;
}
