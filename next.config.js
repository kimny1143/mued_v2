/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'cloudinary.com', 'res.cloudinary.com'],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
      '@components': `${__dirname}/app/components`,
      '@ui': `${__dirname}/app/components/ui`,
      '@sections': `${__dirname}/app/landing-sections`,
      '@lib': `${__dirname}/lib`,
    };
    return config;
  },
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // SSR時のエラーを回避するため、特定のページを動的レンダリングに設定
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // 本番環境用セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig; 