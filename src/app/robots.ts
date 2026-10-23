import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // Allow crawlers to read noindex on booking/admin pages; robots is not access control.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
