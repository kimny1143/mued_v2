import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { locales, type Locale, getPreferredLocale } from "@/lib/i18n/config";
import { buildSignInRedirectTarget } from "@/lib/middleware/sign-in-redirect";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/lobe(.*)",
  "/connect(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/:locale",
  "/:locale/privacy",
  "/:locale/support",
  "/:locale/muedear",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/payment(.*)",
  "/privacy(.*)",
  "/support(.*)",
  "/muedear(.*)",
  "/dial(.*)",
  "/api/dial(.*)",
  "/waitlist(.*)",
  "/readiness(.*)",
  "/api/research(.*)",
]);

// Check if path starts with a locale
function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split("/");
  const potentialLocale = segments[1];
  if (locales.includes(potentialLocale as Locale)) {
    return potentialLocale as Locale;
  }
  return null;
}

// Check if we're in E2E test mode (strict: requires both non-production AND explicit opt-in)
const isNonProduction = process.env.NODE_ENV !== 'production';
const isE2EBypassEnabled = isNonProduction && process.env.ENABLE_E2E_BYPASS === 'true';

export default clerkMiddleware(async (auth, req) => {
  const { pathname, search } = req.nextUrl;
  const hostname = req.headers.get('host') ?? '';

  // Subdomain routing: dial.mued.jp → serve /dial page
  if (hostname.startsWith('dial.')) {
    // Auth-required paths: redirect to mued.jp sign-in with dial.mued.jp LP as return URL.
    // Clerk sessions are scoped to mued.jp (Hobby plan, no satellite).
    // After sign-in, users return to dial.mued.jp/ (public LP) to continue their flow.
    // Prerequisite: https://dial.mued.jp must be in Clerk Dashboard → Allowed redirect URLs.
    if (pathname.startsWith('/dashboard')) {
      // After sign-in on mued.jp, redirect to /dial-return (same-origin) which then
      // does a server-side bounce to dial.mued.jp/. Same-origin redirect_url requires
      // no Clerk Dashboard configuration and works on Hobby plan.
      const signInUrl = new URL('/sign-in', 'https://mued.jp');
      signInUrl.searchParams.set('redirect_url', 'https://mued.jp/dial-return');
      return NextResponse.redirect(signInUrl);
    }

    // Set locale cookie from Accept-Language (dial subdomain has no /ja prefix)
    const acceptLanguage = req.headers.get('accept-language');
    const locale = getPreferredLocale(acceptLanguage);
    if (pathname === '/') {
      const response = NextResponse.rewrite(new URL('/dial', req.url));
      response.cookies.set('NEXT_LOCALE', locale, { path: '/' });
      return response;
    }
    if (pathname === '/waitlist' || pathname === '/readiness') {
      const response = NextResponse.rewrite(new URL(`/dial${pathname}`, req.url));
      response.cookies.set('NEXT_LOCALE', locale, { path: '/' });
      return response;
    }
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', locale, { path: '/' });
    return response;
  }

  // Skip authentication in E2E test mode
  // Requires: (1) NODE_ENV !== 'production' AND (2) ENABLE_E2E_BYPASS=true
  if (isE2EBypassEnabled) {
    const testHeader = req.headers.get('x-test-mode');
    const testQuery = req.nextUrl.searchParams.get('test');

    if (testHeader === 'true' || testQuery === 'true') {
      console.log('[E2E Test Mode] Bypassing Clerk authentication');
      return;
    }
  }

  // Handle root path - permanently redirect to locale-prefixed landing page (308)
  if (pathname === "/") {
    const acceptLanguage = req.headers.get("accept-language");
    const locale = getPreferredLocale(acceptLanguage);
    const response = NextResponse.redirect(new URL(`/${locale}`, req.url), 308);
    response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
    return response;
  }

  // For locale-prefixed routes, set the locale cookie
  const pathLocale = getLocaleFromPath(pathname);
  if (pathLocale) {
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", pathLocale, { path: "/" });
    // For public routes with locale, return the response with cookie
    if (isPublicRoute(req)) {
      return response;
    }
  }

  // Public routes don't require authentication
  if (isPublicRoute(req)) {
    return;
  }

  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      // Keeps the query string (see lib/middleware/sign-in-redirect.ts for why that matters and
      // why the value is forced to stay same-origin).
      signInUrl.searchParams.set('redirect_url', buildSignInRedirectTarget(pathname, search));
      return NextResponse.redirect(signInUrl);
    }
  }
});

export const config = {
  // Exclude /api/dial/upload from middleware — large FormData bodies
  // fail to parse when Edge Runtime middleware processes the request.
  matcher: [
    "/((?!.*\\..*|_next|api/webhooks|api/dial/upload|api/line-webhook).*)",
    "/",
    "/(api(?!/dial/upload|/line-webhook)|trpc)(.*)",
  ],
};