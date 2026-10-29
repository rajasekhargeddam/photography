'use client';

import type { ImageLoaderProps } from 'next/image';
import { photographyImageLoader } from './image-delivery';

// Cloudinary handles remote thumbnails; local assets are served directly.
// No Cloudflare Images binding or paid image transformation service is needed.
export default function cloudflareImageLoader(props: ImageLoaderProps) {
  return photographyImageLoader(props);
}
