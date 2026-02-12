import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { locales, defaultLocale, type Locale, getPreferredLocale } from "@/lib/i18n/config";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/lobe(.*)",
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

// Check if we're in E2E test mode (only in non-production environments)
const isNonProduction = process.env.NODE_ENV !== 'production';
const isE2ETestMode = isNonProduction && (
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true' ||
  process.env.NODE_ENV === 'test'
);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Skip authentication in E2E test mode (ONLY in non-production environments)
  // Security: Header/query bypass is restricted to development/test only
  if (isNonProduction) {
    const testHeader = req.headers.get('x-test-mode');
    const testQuery = req.nextUrl.searchParams.get('test');

    if (isE2ETestMode || testHeader === 'true' || testQuery === 'true') {
      console.log('[E2E Test Mode] Bypassing Clerk authentication (non-production only)');
      return;
    }
  }

  // Handle root path - redirect to locale-prefixed landing page
  if (pathname === "/") {
    const acceptLanguage = req.headers.get("accept-language");
    const locale = getPreferredLocale(acceptLanguage);
    const response = NextResponse.redirect(new URL(`/${locale}`, req.url));
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

  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};