import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

const STATIC = ['', '/about', '/colleges', '/programs', '/faculty', '/news', '/events', '/research', '/campus-tour', '/contact', '/admissions', '/admissions/eligibility'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [colleges, programs, faculty, news, events, research] = await Promise.all([
    api.colleges(),
    api.programs({ pageSize: 100 }),
    api.faculty({ pageSize: 100 }),
    api.news({ pageSize: 100 }),
    api.events({ limit: 100 }),
    api.research({ pageSize: 100 }),
  ]);
  const paths = [
    ...STATIC,
    ...colleges.map((x) => `/colleges/${x.slug}`),
    ...programs.data.map((x) => `/programs/${x.slug}`),
    ...faculty.data.map((x) => `/faculty/${x.slug}`),
    ...news.data.map((x) => `/news/${x.slug}`),
    ...events.map((x) => `/events/${x.slug}`),
    ...research.data.map((x) => `/research/${x.slug}`),
  ];
  return paths.map((p) => ({
    url: `${SITE_URL}/en${p}`,
    alternates: { languages: { en: `${SITE_URL}/en${p}`, ar: `${SITE_URL}/ar${p}` } },
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.7,
  }));
}
