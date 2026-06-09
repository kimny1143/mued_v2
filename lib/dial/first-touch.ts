/**
 * MUEDial first-touch acquisition attribution.
 *
 * Records where a user ORIGINALLY came from, captured at session creation across ALL
 * session-creating paths (checkout / campaign/start / session). The client persists the
 * payload on the user's FIRST /dial landing (first-wins — see first-touch-client.ts) so that
 * multi-step funnels keep the ORIGINAL referrer/utm rather than an internal same-site referer.
 *
 * Stored on dial_sessions.first_touch (JSONB, nullable). Best-effort: building this must NEVER
 * throw or block a checkout / payment flow — callers store the result null-safely.
 */
import { z } from 'zod';

export interface FirstTouch {
  /** document.referrer captured at the user's first /dial landing (the external source). */
  referrer?: string;
  /** Referer header observed server-side on the create request (fallback / cross-check). */
  refererHeader?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** Path (+query) of the first /dial page the user landed on. */
  landingPath?: string;
  /** GA4 client_id (_ga cookie) — lets a session be joined back to GA4 events. */
  gaClientId?: string;
  /** ISO timestamp captured client-side at first landing. */
  capturedAt?: string;
  /** ISO timestamp stamped server-side when the session row was created. */
  serverCapturedAt?: string;
}

/**
 * Loose Zod schema for the client-provided first-touch object on session-create request bodies.
 * Intentionally permissive (all optional): buildFirstTouch() re-validates and clips every field,
 * so a malformed payload degrades to null rather than failing the request.
 */
export const firstTouchInputSchema = z
  .object({
    referrer: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmContent: z.string().optional(),
    utmTerm: z.string().optional(),
    landingPath: z.string().optional(),
    gaClientId: z.string().optional(),
    capturedAt: z.string().optional(),
  })
  .optional();

const STR_MAX = 2048;
const SHORT_MAX = 255;

function clip(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * Build the first_touch JSONB payload for a new dial session.
 *
 * Merges the client-persisted first-touch (document.referrer + utm + landing + ga_client_id,
 * captured at first /dial landing) with the server-observed Referer header. Returns null when
 * nothing is known, so the column stays NULL instead of storing an empty object.
 *
 * Pure + total: never throws — callers rely on this for best-effort, non-blocking capture.
 */
export function buildFirstTouch(headers: Headers, client?: unknown): FirstTouch | null {
  try {
    const c = client && typeof client === 'object' ? (client as Record<string, unknown>) : {};
    const ft: FirstTouch = {};

    const referrer = clip(c.referrer, STR_MAX);
    if (referrer) ft.referrer = referrer;

    const refererHeader = clip(headers.get('referer'), STR_MAX);
    if (refererHeader) ft.refererHeader = refererHeader;

    const utmSource = clip(c.utmSource, SHORT_MAX);
    if (utmSource) ft.utmSource = utmSource;
    const utmMedium = clip(c.utmMedium, SHORT_MAX);
    if (utmMedium) ft.utmMedium = utmMedium;
    const utmCampaign = clip(c.utmCampaign, SHORT_MAX);
    if (utmCampaign) ft.utmCampaign = utmCampaign;
    const utmContent = clip(c.utmContent, SHORT_MAX);
    if (utmContent) ft.utmContent = utmContent;
    const utmTerm = clip(c.utmTerm, SHORT_MAX);
    if (utmTerm) ft.utmTerm = utmTerm;

    const landingPath = clip(c.landingPath, STR_MAX);
    if (landingPath) ft.landingPath = landingPath;

    const gaClientId = clip(c.gaClientId, SHORT_MAX);
    if (gaClientId) ft.gaClientId = gaClientId;

    const capturedAt = clip(c.capturedAt, 40);
    if (capturedAt) ft.capturedAt = capturedAt;

    // Nothing known at all → keep the column NULL.
    if (Object.keys(ft).length === 0) return null;

    ft.serverCapturedAt = new Date().toISOString();
    return ft;
  } catch {
    return null;
  }
}
