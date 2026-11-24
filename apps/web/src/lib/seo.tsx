import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (!configuredSiteUrl) {
  throw new Error('NEXT_PUBLIC_SITE_URL is required. Set the public website origin in the environment.');
}
let parsedSiteUrl: URL;
try {
  parsedSiteUrl = new URL(configuredSiteUrl);
} catch {
  throw new Error('NEXT_PUBLIC_SITE_URL must be a valid absolute HTTP(S) origin.');
}
if (!['http:', 'https:'].includes(parsedSiteUrl.protocol) || parsedSiteUrl.pathname !== '/' || parsedSiteUrl.search || parsedSiteUrl.hash) {
  throw new Error('NEXT_PUBLIC_SITE_URL must contain only the HTTP(S) origin, without a path, query, or hash.');
}
export const SITE_URL = parsedSiteUrl.origin;

/** Builds per-page metadata with canonical URL and hreflang alternates for both languages. */
export async function pageMetadata({ locale, path, title, description, noindex = false, image }: {
  locale: string; path: string; title?: string; description?: string; noindex?: boolean; image?: string | null;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });
  const p = path === '/' ? '' : path;
  const fullTitle = title ? `${title} | ${t('siteName')}` : t('defaultTitle');
  const desc = description ?? t('defaultDescription');
  return {
    title: fullTitle,
    description: desc,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: `/${locale}${p}`,
      languages: { en: `/en${p}`, ar: `/ar${p}`, 'x-default': `/en${p}` },
    },
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      title: fullTitle,
      description: desc,
      locale: locale === 'ar' ? 'ar_AE' : 'en_AE',
      url: `/${locale}${p}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: fullTitle, description: desc },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
