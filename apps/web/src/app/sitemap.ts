import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const API = `${process.env.API_ORIGIN ?? 'http://localhost:4000'}/api/v1`;
const STATIC = ['', '/about', '/colleges', '/programs', '/faculty', '/news', '/events', '/research', '/campus-tour', '/contact', '/admissions', '/admissions/eligibility'];

async function slugs(path: string): Promise<string[]> {
  try {
    const r = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
    if (!r.ok) return [];
    const j = (await r.json()) as { data: { slug: string; departments?: { slug: string }[] }[] };
    return j.data.map((x) => x.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [colleges, programs, faculty, news, events, research] = await Promise.all([
    slugs('/public/colleges'), slugs('/public/programs?pageSize=100'), slugs('/public/faculty?pageSize=100'),
    slugs('/public/news?pageSize=100'), slugs('/public/events?limit=100'), slugs('/public/research?pageSize=100'),
  ]);
  const paths = [
    ...STATIC,
    ...colleges.map((s) => `/colleges/${s}`), ...programs.map((s) => `/programs/${s}`), ...faculty.map((s) => `/faculty/${s}`),
    ...news.map((s) => `/news/${s}`), ...events.map((s) => `/events/${s}`), ...research.map((s) => `/research/${s}`),
  ];
  return paths.map((p) => ({
    url: `${SITE_URL}/en${p}`,
    alternates: { languages: { en: `${SITE_URL}/en${p}`, ar: `${SITE_URL}/ar${p}` } },
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.7,
  }));
}
