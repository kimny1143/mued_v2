/**
 * Resolve track URL with GCS → R2 fallback.
 *
 * GCS signed URLs expire after ~1 hour. If expired, fall back to the R2
 * /stream/ URL (no Content-Disposition, suitable for RoEx API consumption).
 *
 * Returns the best available URL, or null if neither is usable.
 */

/**
 * Parse GCS signed URL expiry from query parameters.
 * GCS signed URLs contain X-Goog-Date (ISO-ish) and X-Goog-Expires (seconds).
 * Example: X-Goog-Date=20260319T120000Z&X-Goog-Expires=3600
 */
function getGcsExpiry(url: string): Date | null {
  try {
    const u = new URL(url);
    const dateStr = u.searchParams.get('X-Goog-Date');
    const expiresSec = u.searchParams.get('X-Goog-Expires');

    if (!dateStr || !expiresSec) return null;

    // X-Goog-Date format: 20260319T120000Z → 2026-03-19T12:00:00Z
    const iso = dateStr.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
      '$1-$2-$3T$4:$5:$6Z',
    );
    const start = new Date(iso);
    if (isNaN(start.getTime())) return null;

    return new Date(start.getTime() + parseInt(expiresSec, 10) * 1000);
  } catch {
    return null;
  }
}

function isGcsUrlExpired(url: string): boolean {
  const expiry = getGcsExpiry(url);
  if (!expiry) {
    // Can't parse expiry (no X-Goog-Date/Expires) → fail-safe: treat as expired so resolveTrackUrl
    // falls back to the permanent r2_url instead of handing RoEx an un-vouchable GCS URL. A
    // just-uploaded stem's GCS URL is X-Goog-signed and parses fine, so this does not reject fresh
    // uploads. (Incident 2026-06-15: a copied session's long-dead GCS upload URL 500'd because this
    // returned false.)
    return true;
  }
  // Add 2-minute buffer so we don't send an about-to-expire URL
  return new Date() > new Date(expiry.getTime() - 2 * 60 * 1000);
}

export interface TrackWithUrls {
  roexUploadUrl: string;
  r2Url: string | null;
}

/**
 * Resolve the best URL for a track, falling back to R2 if GCS is expired.
 * Returns null if no valid URL is available.
 */
export function resolveTrackUrl(track: TrackWithUrls): string | null {
  // GCS-first: when the upload URL is still valid, submit it. RoEx keys its fxSettings / stem
  // output by the SUBMITTED URL's basename, and every consumer (final FX lookup at
  // final/route.ts, stem labels, ZIP names) derives that key from roexUploadUrl — so preferring
  // r2_url here would change the submitted identity and silently break those lookups (omakase
  // basic-final loses per-track gain). Fall back to the permanent r2_url only when the GCS URL is
  // expired or unparseable (isGcsUrlExpired, fail-safe), which closes the dead-GCS hazard for
  // returning/copied sessions. (Reverted the brief 2026-06-15 r2-first reorder; the fail-safe
  // alone fixes the dead-GCS case without the key-identity change.)
  if (!isGcsUrlExpired(track.roexUploadUrl)) {
    return track.roexUploadUrl;
  }

  if (track.r2Url) {
    return track.r2Url;
  }

  return null;
}

/**
 * Resolve all track URLs. Returns the resolved URLs or throws if any track
 * has no valid URL (GCS expired and no R2 fallback).
 */
export function resolveAllTrackUrls(
  tracks: TrackWithUrls[],
): { trackUrl: string; original: TrackWithUrls }[] {
  const results: { trackUrl: string; original: TrackWithUrls }[] = [];
  const expired: string[] = [];

  for (const track of tracks) {
    const url = resolveTrackUrl(track);
    if (!url) {
      expired.push(track.roexUploadUrl);
    } else {
      results.push({ trackUrl: url, original: track });
    }
  }

  if (expired.length > 0) {
    throw new Error(
      `Stem URLs have expired and no R2 fallback is available. Please re-upload your stems. (${expired.length} track(s) affected)`,
    );
  }

  return results;
}
