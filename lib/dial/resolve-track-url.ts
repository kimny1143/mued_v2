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
    // Can't parse expiry (no X-Goog-Date/Expires) → fail-safe: treat as expired so we never
    // hand RoEx a URL we can't vouch for. With resolveTrackUrl() preferring r2_url first, this
    // only affects tracks WITHOUT an R2 copy; a just-uploaded stem's GCS URL is X-Goog-signed
    // and parses fine, so this does not reject fresh uploads. (Incident 2026-06-15: a copied
    // session's long-dead GCS upload URL was passed to RoEx → 500, because this returned false.)
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
  // Prefer the permanent R2 copy whenever it exists. R2 /stream/ URLs never expire and are
  // RoEx-readable, so for any returning or copied session (whose GCS roex_upload_url may be
  // long dead) this is always the safe choice. GCS-first previously handed RoEx a dead URL
  // whenever isGcsUrlExpired() couldn't parse the expiry — incident 2026-06-15 (Yuu goodwill
  // session preview 500).
  if (track.r2Url) {
    return track.r2Url;
  }

  // No R2 copy yet (e.g. immediately after upload, before the async copy lands): fall back to
  // the GCS upload URL while it's still valid. If validity can't be confirmed, return null so
  // the caller surfaces an actionable "re-upload" error rather than risk a dead URL.
  if (!isGcsUrlExpired(track.roexUploadUrl)) {
    return track.roexUploadUrl;
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
