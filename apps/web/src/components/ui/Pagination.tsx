import { getTranslations } from 'next-intl/server';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { PageMeta } from '@/lib/types';
import { cn } from './cn';

export async function Pagination({ meta, basePath, params }: { meta: PageMeta; basePath: string; params: Record<string, string | undefined> }) {
  if (meta.totalPages <= 1) return null;
  const t = await getTranslations('common');
  const href = (page: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set('page', String(page));
    return `${basePath}?${q.toString()}`;
  };
  const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - meta.page) <= 2 || p === 1 || p === meta.totalPages);
  return (
    <nav aria-label={t('page', { page: meta.page, total: meta.totalPages })} className="mt-10 flex items-center justify-center gap-1.5">
      {meta.page > 1 && <Link href={href(meta.page - 1)} aria-label={t('previous')} className="grid size-10 place-items-center rounded-full border border-line bg-white hover:border-gold-500"><ChevronLeft className="flip-rtl size-4" /></Link>}
      {pages.map((p) => (
        <Link key={p} href={href(p)} aria-current={p === meta.page ? 'page' : undefined} className={cn('grid size-10 place-items-center rounded-full border text-sm font-semibold', p === meta.page ? 'border-brand-900 bg-brand-900 text-white' : 'border-line bg-white text-brand-800 hover:border-gold-500')}>
          {p}
        </Link>
      ))}
      {meta.page < meta.totalPages && <Link href={href(meta.page + 1)} aria-label={t('next')} className="grid size-10 place-items-center rounded-full border border-line bg-white hover:border-gold-500"><ChevronRight className="flip-rtl size-4" /></Link>}
    </nav>
  );
}
