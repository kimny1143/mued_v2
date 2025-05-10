/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // 開発環境でのみHTTPSを無効に
  assetPrefix: process.env.NODE_ENV === 'development' ? undefined : undefined,
  // 静的なアセットのディレクトリ
  images: {
    domains: ['images.unsplash.com', 'cloudinary.com'],
  },
  // 環境変数
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
  // ビルド時の警告を無視
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // エイリアス設定
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': `${__dirname}`,
      '@components': `${__dirname}/app/components`,
      '@ui': `${__dirname}/app/components/ui`,
      '@sections': `${__dirname}/app/landing-sections`,
      '@lib': `${__dirname}/lib`,
    };
    return config;
  },
  // 開発環境ではヘッダーを設定しない
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [];
    }
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  // Vercelデプロイ用設定
  output: 'export', // 静的エクスポートに変更
  experimental: {
    // SSR only
    runtime: 'nodejs',
    serverComponents: true,
  },
  // 静的解析を無効化
  staticPageGenerationTimeout: 1000,
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'out',
  trailingSlash: true,
};

module.exports = nextConfig; 