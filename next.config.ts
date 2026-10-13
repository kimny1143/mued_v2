import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import { contentSecurityPolicy } from "./lib/security/content-security-policy";
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
    // lib/licenses/third-party.ts reads these at request time (same reason as /learn).
    "/[locale]/licenses": ["./content/licenses/**/*.md"],
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
            value: contentSecurityPolicy({ isProduction: process.env.NODE_ENV === 'production' }),
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
      // Self-hosted fonts carry their content hash in the file name (scripts/fonts/sync-google-fonts.mjs),
      // so a URL never changes meaning: cache it for good, like /_next/static.
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
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
      // Already-distributed download aliases retain their files in public/downloads, but requests use
      // the canonical 0.1.2 artifacts so an old filename cannot keep serving an older build.
      {
        source: '/downloads/MUEDlim-0.1.0-alpha-installer.pkg',
        destination: '/downloads/MUEDlim-0.1.2-installer.pkg',
        permanent: false,
      },
      {
        source: '/downloads/MUEDlim-0.1.1-alpha-installer.pkg',
        destination: '/downloads/MUEDlim-0.1.2-installer.pkg',
        permanent: false,
      },
      {
        source: '/downloads/MUEDrive-0.1.0-alpha-installer.pkg',
        destination: '/downloads/MUEDrive-0.1.2-installer.pkg',
        permanent: false,
      },
      {
        source: '/downloads/MUEDsat-0.1.0-alpha-installer.pkg',
        destination: '/downloads/MUEDsat-0.1.2-installer.pkg',
        permanent: false,
      },
      {
        source: '/downloads/MUEDsat-0.1.1-alpha-installer.pkg',
        destination: '/downloads/MUEDsat-0.1.2-installer.pkg',
        permanent: false,
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
      { source: '/muedvox', destination: '/en/muedvox', permanent: false },
      { source: '/muedsp', destination: '/en/muedsp', permanent: false },
      // Safety net for the third legal page. The in-page links now carry the locale (the pages themselves
      // are the fix), but bare /tokushoho can still arrive from bookmarks, already-sent email and external
      // citations — it 404'd until now, unlike its /privacy + /support siblings above. Temporary (307),
      // matching the product pages rather than the permanent /privacy: the legal trio is locale-symmetric
      // (JA is the primary audience for a 特定商取引法 disclosure), so a permanently-cached EN target
      // would be a liability if this is ever made locale-aware.
      { source: '/tokushoho', destination: '/en/tokushoho', permanent: false },
      // Terms and Refund, added 2026-09-16 for the FastSpring store-activation requirement. Same 307
      // treatment as /tokushoho above and for the same reason: the legal set is locale-symmetric, so a
      // permanently-cached EN target would be a liability for a JA-primary audience.
      // These two are additionally cited FROM the FastSpring dashboard, where the URL is typed once and
      // then served to every buyer — a bare path that 404s there blocks checkout rather than merely
      // losing the locale. tests/unit/locale-page-bare-paths.test.ts caught their absence (the population
      // there is the filesystem, so a new locale page enters it without anyone remembering to add it).
      { source: '/terms', destination: '/en/terms', permanent: false },
      { source: '/refund', destination: '/en/refund', permanent: false },
      // Third-party licenses (EULA Section 9 links here). Same 307 treatment as the legal set above.
      { source: '/licenses', destination: '/en/licenses', permanent: false },
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
