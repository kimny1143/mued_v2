/**
 * MUEDial R2 Deliverables — Cloudflare Worker
 *
 * Stores final mix/master deliverables in R2 so download links
 * survive after RoEx GCS signed URLs expire.
 *
 * Endpoints:
 *   POST /copy      — Server-to-server: fetch from RoEx GCS, stream to R2
 *   GET  /download/* — Public (CORS): stream file from R2 as attachment
 *   OPTIONS          — CORS preflight for /download
 */

interface Env {
  DELIVERABLES: R2Bucket;
  ALLOWED_ORIGINS: string;
  R2_COPY_SECRET: string;
  ROEX_WEBHOOK_SECRET: string;
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

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = getAllowedOrigins(env);

  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

/** Extract filename from an R2 key. e.g. "sessions/abc/Final_Mix.wav" → "Final_Mix.wav" */
function filenameFromKey(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 1] || key;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = getCorsHeaders(request, env);

    // ── CORS preflight ────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── POST /copy — server-to-server copy from GCS to R2 ────────────────
    if (request.method === 'POST' && url.pathname === '/copy') {
      // Auth check
      const secret = request.headers.get('X-R2-Secret');
      if (!secret || secret !== env.R2_COPY_SECRET) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      // Parse body
      let body: { sourceUrl?: string; key?: string };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }

      const { sourceUrl, key } = body;
      if (!sourceUrl || !key) {
        return jsonResponse({ error: 'Missing sourceUrl or key' }, 400);
      }

      // Fetch source file (RoEx GCS)
      let sourceResponse: Response;
      try {
        sourceResponse = await fetch(sourceUrl);
      } catch (err) {
        return jsonResponse(
          { error: 'Failed to fetch source', detail: String(err) },
          502,
        );
      }

      if (!sourceResponse.ok) {
        return jsonResponse(
          { error: 'Source returned error', status: sourceResponse.status },
          502,
        );
      }

      if (!sourceResponse.body) {
        return jsonResponse({ error: 'Source returned empty body' }, 502);
      }

      // Stream to R2
      const httpMetadata: R2HTTPMetadata = {
        contentType:
          sourceResponse.headers.get('Content-Type') || 'audio/wav',
      };

      let r2Object: R2Object;
      try {
        r2Object = await env.DELIVERABLES.put(key, sourceResponse.body, {
          httpMetadata,
        });
      } catch (err) {
        return jsonResponse(
          { error: 'Failed to write to R2', detail: String(err) },
          500,
        );
      }

      return jsonResponse({
        success: true,
        key,
        size: r2Object.size,
      }, 200);
    }

    // ── POST /webhooks/roex — RoEx webhook receiver (validate + ack only) ──
    // RoEx's /masteringpreview EAGERLY connects to the configured webhookURL at submit and
    // requires a 2xx, or it 503s ("Problem initiating a mastering task"). MUED polls RoEx for
    // results (does NOT consume this callback), so this endpoint only verifies the secret and
    // acks 200. Hosting it on this Cloudflare worker — not the Vercel app — keeps RoEx's
    // datacenter IP off Vercel's managed DDoS Mitigation, which was denying RoEx and breaking
    // mastering (incident 2026-06-15). Mirrors app/api/webhooks/roex secret check.
    if (request.method === 'POST' && url.pathname === '/webhooks/roex') {
      const expectedSecret = env.ROEX_WEBHOOK_SECRET;
      if (expectedSecret) {
        const secret = url.searchParams.get('secret');
        if (secret !== expectedSecret) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }
      } else {
        // Fail-open mirror of app/api/webhooks/roex: if the secret is unset, the
        // endpoint accepts any caller. Surface it loudly so a missing binding is
        // caught, not silently un-authenticated.
        console.warn('CRITICAL: ROEX_WEBHOOK_SECRET not configured — /webhooks/roex auth DISABLED (accepting all callers)');
      }
      // Ack only — RoEx result is retrieved by MUED via polling, not this callback.
      return jsonResponse({ ok: true }, 200);
    }

    // ── GET /download/* — public download from R2 (attachment) ─────────────
    if (request.method === 'GET' && url.pathname.startsWith('/download/')) {
      const key = decodeURIComponent(url.pathname.slice('/download/'.length));
      if (!key) {
        return jsonResponse({ error: 'Missing key' }, 400, cors);
      }

      const object = await env.DELIVERABLES.get(key);
      if (!object) {
        return jsonResponse({ error: 'Not found' }, 404, cors);
      }

      const filename = filenameFromKey(key);

      const headers: Record<string, string> = {
        ...cors,
        'Content-Type':
          object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      };

      if (object.size) {
        headers['Content-Length'] = String(object.size);
      }

      return new Response(object.body, { status: 200, headers });
    }

    // ── GET /stream/* — inline streaming from R2 (no Content-Disposition) ──
    // Used by RoEx API to fetch stems. No attachment header = no download issues.
    if (request.method === 'GET' && url.pathname.startsWith('/stream/')) {
      const key = decodeURIComponent(url.pathname.slice('/stream/'.length));
      if (!key) {
        return jsonResponse({ error: 'Missing key' }, 400, cors);
      }

      const object = await env.DELIVERABLES.get(key);
      if (!object) {
        return jsonResponse({ error: 'Not found' }, 404, cors);
      }

      const headers: Record<string, string> = {
        ...cors,
        'Content-Type':
          object.httpMetadata?.contentType || 'audio/wav',
        'Cache-Control': 'public, max-age=86400',
      };

      if (object.size) {
        headers['Content-Length'] = String(object.size);
      }

      return new Response(object.body, { status: 200, headers });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  },
};

export default worker;
