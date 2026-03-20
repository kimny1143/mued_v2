/**
 * MUEDial Audio Proxy — Cloudflare Worker
 *
 * Two jobs, both solving CORS on RoEx's GCS bucket:
 *
 * 1. PUT (upload):
 *    Browser --PUT (60MB WAV)--> Worker --stream--> RoEx GCS
 *    Bypasses Vercel's 4.5MB body limit. No buffering, no storage.
 *
 * 2. GET (playback):
 *    Browser --GET--> Worker --fetch--> RoEx GCS --stream--> Browser
 *    Adds CORS headers so Web Audio API (analyzer) doesn't mute audio.
 *    Target URL passed as ?url= query parameter.
 */

interface Env {
  ALLOWED_ORIGINS: string; // comma-separated, e.g. "https://dial.mued.jp,https://mued.jp"
}

const DEFAULT_ORIGINS = [
  'https://dial.mued.jp',
  'https://mued.jp',
  'https://www.mued.jp',
  'http://localhost:3000',
];

function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : DEFAULT_ORIGINS;
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  return allowed.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$');
      return regex.test(origin);
    }
    return pattern === origin;
  });
}

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = getAllowedOrigins(env);

  return {
    'Access-Control-Allow-Origin': isOriginAllowed(origin, allowed) ? origin : '',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Target',
    'Access-Control-Max-Age': '86400',
  };
}

function isAllowedTarget(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow RoEx's GCS signed URLs
    return parsed.hostname.endsWith('storage.googleapis.com');
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = getCorsHeaders(request, env);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── GET: Audio playback proxy ──────────────────────────────────────────
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing ?url= parameter', { status: 400, headers: cors });
      }
      if (!isAllowedTarget(targetUrl)) {
        return new Response('Invalid target URL', { status: 403, headers: cors });
      }

      // Forward Range header for seeking support
      const gcsHeaders: Record<string, string> = {};
      const range = request.headers.get('Range');
      if (range) gcsHeaders['Range'] = range;

      const gcsResponse = await fetch(targetUrl, { headers: gcsHeaders });

      // Stream GCS response back with CORS headers
      const ct = gcsResponse.headers.get('Content-Type') || 'audio/mpeg';
      const ext = ct.includes('wav') ? 'wav' : 'mp3';
      const responseHeaders: Record<string, string> = {
        ...cors,
        'Content-Type': ct,
        'Content-Disposition': `inline; filename="MUEDial-preview.${ext}"`,
        'Cache-Control': 'public, max-age=3600',
      };
      // Preserve Content-Length and range headers
      const cl = gcsResponse.headers.get('Content-Length');
      if (cl) responseHeaders['Content-Length'] = cl;
      const cr = gcsResponse.headers.get('Content-Range');
      if (cr) responseHeaders['Content-Range'] = cr;
      const ar = gcsResponse.headers.get('Accept-Ranges');
      if (ar) responseHeaders['Accept-Ranges'] = ar;

      return new Response(gcsResponse.body, {
        status: gcsResponse.status,
        headers: responseHeaders,
      });
    }

    // ── PUT: Upload proxy ──────────────────────────────────────────────────
    if (request.method === 'PUT') {
      const targetUrl = request.headers.get('X-Upload-Target');
      if (!targetUrl) {
        return new Response('Missing X-Upload-Target header', { status: 400, headers: cors });
      }
      if (!isAllowedTarget(targetUrl)) {
        return new Response('Invalid target URL', { status: 403, headers: cors });
      }

      const gcsResponse = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': request.headers.get('Content-Type') || 'audio/wav',
        },
        body: request.body,
      });

      return new Response(null, {
        status: gcsResponse.ok ? 200 : gcsResponse.status,
        headers: cors,
      });
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  },
};
