/**
 * MUED Videos CDN — Cloudflare Worker
 *
 * Public CDN for promo/short videos (MP4).
 * Uploaded via `wrangler r2 object put` from GitHub Actions.
 *
 * Endpoints:
 *   GET /v/{filename} — Public video streaming (inline, long cache)
 *   GET /             — Health check
 */

interface Env {
  VIDEOS: R2Bucket;
}

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers — allow any origin (public CDN)
    const cors: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check
    if (url.pathname === '/') {
      return new Response(JSON.stringify({ status: 'ok', service: 'mued-videos-cdn' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    // GET /v/{filename}
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/v/')) {
      const key = decodeURIComponent(url.pathname.slice('/v/'.length));
      if (!key) {
        return new Response(JSON.stringify({ error: 'Missing filename' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }

      const object = await env.VIDEOS.get(key);
      if (!object) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }

      const headers: Record<string, string> = {
        ...cors,
        'Content-Type': object.httpMetadata?.contentType || getContentType(key),
        'Cache-Control': 'public, max-age=31536000, immutable',
      };

      if (object.size) {
        headers['Content-Length'] = String(object.size);
      }

      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
      }

      return new Response(object.body, { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  },
};

export default worker;
