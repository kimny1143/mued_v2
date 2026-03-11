/**
 * MUEDial Upload Proxy — Cloudflare Worker
 *
 * Streams audio files from the browser to RoEx GCS signed URLs.
 * Exists solely to bypass CORS restrictions on RoEx's GCS bucket
 * and Vercel's 4.5MB serverless function body size limit.
 *
 * Flow:
 *   Browser --PUT (60MB WAV)--> Worker --stream--> RoEx GCS
 *   (no buffering, no storage, just a pipe)
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

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : DEFAULT_ORIGINS;

  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

    if (request.method !== 'PUT') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // Target GCS signed URL passed via header
    const targetUrl = request.headers.get('X-Upload-Target');
    if (!targetUrl) {
      return new Response('Missing X-Upload-Target header', { status: 400, headers: cors });
    }

    if (!isAllowedTarget(targetUrl)) {
      return new Response('Invalid target URL', { status: 403, headers: cors });
    }

    // Stream request body directly to GCS — no buffering
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
  },
};
