import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // テスト時にNext.js開発オーバーレイを無効化
  reactStrictMode: true,
  experimental: {
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.clerk.accounts.dev https://clerk.mued.jp https://api.clerk.com https://tonn.roexaudio.com https://muedial-upload-proxy.glasswerkskimny.workers.dev https://muedial-r2.glasswerkskimny.workers.dev https://mued-videos-cdn.glasswerkskimny.workers.dev https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.sentry.io",
              "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
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
    ];
  },
};

export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
  // Suppresses all Sentry SDK build logs
  silent: true,
  // Disable source map upload (enable when SENTRY_AUTH_TOKEN is configured)
  sourcemaps: {
    disable: true,
  },
});
