import type { Settings } from './types';

export type Loc = 'en' | 'ar';

/** Picks the localised variant of a bilingual field pair, e.g. pick(item, 'title', 'ar') → item.titleAr (falls back to English). */
export function pick<T extends object>(obj: T, base: string, locale: string): string {
  const rec = obj as Record<string, unknown>;
  const v = rec[`${base}${locale === 'ar' ? 'Ar' : 'En'}`] ?? rec[`${base}En`];
  return typeof v === 'string' ? v : '';
}

export function pickArr<T extends object>(obj: T, base: string, locale: string): string[] {
  const rec = obj as Record<string, unknown>;
  const v = rec[`${base}${locale === 'ar' ? 'Ar' : 'En'}`];
  const en = rec[`${base}En`];
  return Array.isArray(v) && v.length ? (v as string[]) : Array.isArray(en) ? (en as string[]) : [];
}

/** A setting value is shown only if it exists AND is confirmed. */
export function setting(settings: Settings, key: string, locale: string): string | null {
  const s = settings[key];
  if (!s || s.confirmation !== 'CONFIRMED') return null;
  return (locale === 'ar' ? s.ar ?? s.en : s.en) ?? null;
}

/** Returns a value even when unconfirmed (for working names flagged as proposed). */
export function settingRaw(settings: Settings, key: string, locale: string) {
  const s = settings[key];
  if (!s) return { value: null, confirmed: false };
  return { value: (locale === 'ar' ? s.ar ?? s.en : s.en) ?? null, confirmed: s.confirmation === 'CONFIRMED' };
}

export function formatDate(iso: string | Date | null | undefined, locale: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', { timeZone: 'Asia/Dubai', ...opts }).format(new Date(iso));
}

export function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
