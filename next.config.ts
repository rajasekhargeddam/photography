import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudflare-image-loader.ts',
  },
};

export default nextConfig;
