import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/en/login', '/ar/login', '/en/register', '/ar/register', '/en/admissions/apply', '/ar/admissions/apply', '/en/account', '/ar/account', '/en/admissions/status', '/ar/admissions/status'],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
