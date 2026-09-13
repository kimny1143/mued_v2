import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // テスト時にNext.js開発オーバーレイを無効化
  reactStrictMode: true,
  // /learn reads content/learn/*.md via fs at request time (the root layout's cookies() makes routes
  // dynamic), and the slug is variable so nft can't trace the reads. Force-include the seed markdown so
  // it's in the serverless bundle (else runtime ENOENT).
  outputFileTracingIncludes: {
    "/learn": ["./content/learn/**/*.md"],
    "/learn/[slug]": ["./content/learn/**/*.md"],
  },
  experimental: {
    // The design preview restored pre-rollout globals.css from the build cache despite
    // deploying the current commit (9d6154ba). Recompute production CSS from source.
    turbopackFileSystemCacheForBuild: false,
    // 開発エラーオーバーレイをテスト環境で無効化
    ...(process.env.NODE_ENV === 'test' && {
      nextScriptWorkers: false,
    }),
  },
  // テスト用の環境変数
  env: {
    NEXT_PUBLIC_TEST_MODE: process.env.NODE_ENV === 'test' ? 'true' : 'false',
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://*.clerk.accounts.dev https://clerk.mued.jp https://challenges.cloudflare.com https://va.vercel-scripts.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.clerk.accounts.dev https://clerk.mued.jp https://api.clerk.com https://tonn.roexaudio.com https://muedial-upload-proxy.glasswerkskimny.workers.dev https://muedial-r2.glasswerkskimny.workers.dev https://mued-videos-cdn.glasswerkskimny.workers.dev https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.sentry.io",
              "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.mued.jp",
              "worker-src 'self' blob:",
              "media-src 'self' blob: https://muedial-r2.glasswerkskimny.workers.dev https://mued-videos-cdn.glasswerkskimny.workers.dev",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
  // Redirects for legacy paths
  async redirects() {
    return [
      {
        source: '/privacy',
        destination: '/en/privacy',
        permanent: true,
      },
      {
        source: '/support',
        destination: '/en/support',
        permanent: true,
      },
      // Non-locale product pages: app/[locale]/{muedsat,muedlim,muedsp} only exist under a locale, so the
      // bare /muedsp (used as a locale-agnostic entry in the free-plugin welcome-email forward CTA, the
      // portal empty-CTA, and the /learn gate) 404s without this. → /en (the site's x-default). Temporary
      // (not permanent) because these are locale-symmetric pages — keeps the option to make /muedsp
      // locale-aware later, unlike the EN-primary /privacy above.
      // ★This list is hand-enumerated while the plugin family itself is typed (PLUGIN_DIST is a
      // Record<PluginKey, …>, so a new module cannot omit its lpPath without failing tsc). Nothing
      // enforced the two staying in step, and muedrive shipped without its line — bare /muedrive was a
      // hard 404 in production from launch until 2026-08-29 (found by product課). Reachable from any
      // hand-composed link, so tests/unit/plugin-bare-path-redirects.test.ts now derives the expected
      // set from PLUGIN_DIST instead of repeating this list: a 5th module fails the test, not prod.
      // ★Non-plugin public pages with the same shape (product課 measured 2026-08-29: both were
      //   bare-404 with a 200 locale page, exactly like /muedrive). ★/redesign is deliberately
      //   absent — it is a noindex preview route, see the allowlist in the test.
      { source: '/advisory', destination: '/en/advisory', permanent: false },
      { source: '/muedial', destination: '/en/muedial', permanent: false },
      { source: '/muedsat', destination: '/en/muedsat', permanent: false },
      { source: '/muedlim', destination: '/en/muedlim', permanent: false },
      { source: '/muedrive', destination: '/en/muedrive', permanent: false },
      { source: '/muedsp', destination: '/en/muedsp', permanent: false },
      // Safety net for the third legal page. The in-page links now carry the locale (the pages themselves
      // are the fix), but bare /tokushoho can still arrive from bookmarks, already-sent email and external
      // citations — it 404'd until now, unlike its /privacy + /support siblings above. Temporary (307),
      // matching the product pages rather than the permanent /privacy: the legal trio is locale-symmetric
      // (JA is the primary audience for a 特定商取引法 disclosure), so a permanently-cached EN target
      // would be a liability if this is ever made locale-aware.
      { source: '/tokushoho', destination: '/en/tokushoho', permanent: false },
      // Convenience redirects for short paths → canonical /dial/* paths
      {
        source: '/waitlist',
        destination: '/dial/waitlist',
        permanent: false,
      },
      {
        source: '/waitlist/:path*',
        destination: '/dial/waitlist/:path*',
        permanent: false,
      },
      {
        source: '/readiness',
        destination: '/dial/readiness',
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Suppresses all Sentry SDK build logs
  silent: true,
  // Disable source map upload (enable when SENTRY_AUTH_TOKEN is configured)
  sourcemaps: {
    disable: true,
  },
});
