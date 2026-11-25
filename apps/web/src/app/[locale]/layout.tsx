import type { Viewport } from 'next';
import { Amiri, Cormorant_Garamond, IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { FeaturedContent } from '@/components/site/FeaturedContent';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { HideOnPortal } from '@/components/site/HideOnPortal';
import { routing } from '@/i18n/routing';
import { api } from '@/lib/api';
import { pageMetadata } from '@/lib/seo';
import '../globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-cormorant', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const amiri = Amiri({ subsets: ['arabic', 'latin'], weight: ['400', '700'], variable: '--font-amiri', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'], variable: '--font-plex-arabic', display: 'swap' });

export const viewport: Viewport = { themeColor: '#0b3a3c', width: 'device-width', initialScale: 1 };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({ locale, path: '/' });
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('common');
  // Settings are non-critical for chrome rendering: fall back to empty if the API is down.
  const settings = await api.settings().catch(() => ({}));

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${cormorant.variable} ${inter.variable} ${amiri.variable} ${plexArabic.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider>
          <a href="#main" className="sr-only z-50 rounded bg-gold-500 px-4 py-2 font-semibold text-brand-950 focus:not-sr-only focus:fixed focus:start-4 focus:top-4">{t('skipToContent')}</a>
          <HideOnPortal><Header /></HideOnPortal>
          <main id="main" className="flex-1">{children}</main>
          <HideOnPortal><FeaturedContent /></HideOnPortal>
          <HideOnPortal><Footer settings={settings} nameEn="Al Ahmadiya" nameAr="الأحمدية" /></HideOnPortal>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
