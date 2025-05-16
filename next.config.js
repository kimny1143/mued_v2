/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'cloudinary.com'],
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
};
module.exports = nextConfig; 