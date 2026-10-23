import type { MetadataRoute } from 'next';
import { site } from '@/config/site';
import { publicPages } from '@/config/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(publicPages).map((path) => ({
    url: new URL(path, site.url).href,
  }));
}
