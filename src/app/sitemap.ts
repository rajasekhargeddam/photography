import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  // Add routes when their real content is ready; placeholders are excluded.
  return [{ url: site.url }];
}
