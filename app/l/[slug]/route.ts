/**
 * `mued.jp/l/<slug>` — the short-link redirector.
 *
 * ★307, never 308/301. A permanent redirect is cached by the browser essentially forever, which
 * would make "changing a destination is one table row plus a deploy" false for every reader who had
 * already clicked — the exact promise this design is being built to keep. 307 also preserves the
 * method, though only GET/HEAD reach here in practice.
 *
 * ★An unknown slug is a 404, explicitly. On this site a 200 proves nothing: a nonexistent endpoint
 * still answers 200 with HTML (`x-matched-path: /_not-found`), so a short link that quietly stopped
 * redirecting would look indistinguishable from one that worked unless the check reads `Location`
 * and the status. scripts/verify/short-links.ts checks exactly those, with a negative control.
 *
 * ★Middleware does not touch this path (measured 2026-08-29): `/l/:slug` matches neither
 * isProtectedRoute nor isPublicRoute, so clerkMiddleware falls through. `/l(.*)` is listed in
 * isPublicRoute anyway, so that a future catch-all protected route cannot silently start bouncing
 * published links to /sign-in.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { SHORT_LINKS } from '@/lib/short-links/table';
import { resolveShortLink } from '@/lib/short-links/resolve';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const target = resolveShortLink(SHORT_LINKS, slug, request.nextUrl.searchParams);

  if (!target) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const response = NextResponse.redirect(target, 307);
  // ★no-store so a repointed row takes effect on the next click rather than after a cache expires.
  response.headers.set('cache-control', 'no-store');
  return response;
}
