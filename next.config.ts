import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

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

export default withNextIntl(nextConfig);
