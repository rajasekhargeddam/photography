import type { NextConfig } from 'next';
import { parseVariant } from './src/config/app-variant';

const nextConfig: NextConfig = {
  env: { APP_VARIANT: parseVariant(process.env.APP_VARIANT) },
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudflare-image-loader.ts',
  },
};

export default nextConfig;
