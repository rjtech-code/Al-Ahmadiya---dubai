import { setRequestLocale } from 'next-intl/server';

export type LocaleParams = { params: Promise<{ locale: string }> };
export type SlugParams = { params: Promise<{ locale: string; slug: string }> };
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Resolves locale param and enables static rendering for next-intl. */
export async function initPage(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale;
}

export function sp(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function heritageImage<T extends { path: string }>(media: T[], file: string) {
  return media.find((m) => m.path.endsWith(file)) ?? null;
}
