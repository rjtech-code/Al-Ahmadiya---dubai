'use client';

import { ArrowRight, BookOpen, Building2, CalendarDays, GraduationCap, NotebookPen, Pin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Empty, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

type Category = 'EXAM' | 'TIMETABLE' | 'COURSE' | 'ACADEMIC' | 'CAMPUS';
interface Update {
  id: string; category: Category; isNew: boolean; pinned: boolean; publishedAt: string; link: string | null;
  titleEn: string; titleAr: string; bodyEn: string; bodyAr: string;
}

const CATS: Record<Category, { icon: typeof BookOpen; tone: string }> = {
  EXAM: { icon: NotebookPen, tone: 'bg-red-50 text-danger' },
  TIMETABLE: { icon: CalendarDays, tone: 'bg-gold-100 text-gold-700' },
  COURSE: { icon: BookOpen, tone: 'bg-emerald-50 text-success' },
  ACADEMIC: { icon: GraduationCap, tone: 'bg-cream-200 text-brand-900' },
  CAMPUS: { icon: Building2, tone: 'bg-sky-50 text-sky-800' },
};

/** Academic updates feed (exams, timetables, new courses, announcements) — separate from personal notifications. */
export function UpdatesPanel({ className }: { className?: string } = {}) {
  const t = useTranslations('portal.dash');
  const f = useFmt();
  const ar = useLocale() === 'ar';
  const { data } = useApi<Update[]>('/me/portal/updates');
  const [cat, setCat] = useState<Category | 'ALL'>('ALL');
  const rows = (data ?? []).filter((u) => cat === 'ALL' || u.category === cat);
  const cats = [...new Set((data ?? []).map((u) => u.category))];

  return (
    <section aria-label={t('updatesTitle')} className={cn('flex h-[40vh] min-h-80 flex-col overflow-hidden rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_10px_30px_-18px_rgb(11_58_60/0.25)]', className)}>
      <div role="tablist" aria-label={t('updatesTitle')} className="pattern-girih flex shrink-0 gap-1.5 overflow-x-auto bg-brand-900 px-4 py-3 sm:px-5">
        {(['ALL', ...cats] as const).map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
            className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors', cat === c ? 'bg-gold-400 text-brand-950' : 'bg-white/10 text-white/85 hover:bg-white/20')}>
            {c === 'ALL' ? t('updatesAll') : t(`updatesCat.${c}`)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {!data ? <p className="p-3 text-sm text-muted">…</p> : !rows.length ? <Empty text={t('updatesEmpty')} /> : (
          <ul className="space-y-2">
            {rows.map((u) => {
              const { icon: Icon, tone } = CATS[u.category] ?? CATS.ACADEMIC;
              const body = (
                <>
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', tone)}><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                      <span className={cn('rounded-full px-2 py-0.5', tone)}>{t(`updatesCat.${u.category}`)}</span>
                      {u.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-2 py-0.5 text-white"><Pin className="size-3" />{t('updatesPinned')}</span>}
                      {u.isNew && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-brand-950">{t('updatesNew')}</span>}
                      <span className="ms-auto font-normal text-muted">{f.date(u.publishedAt)}</span>
                    </span>
                    <span className="mt-1 block font-semibold text-brand-900">{f.L(u)}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-ink/75">{ar ? u.bodyAr : u.bodyEn}</span>
                  </span>
                  {u.link && <ArrowRight className="mt-1 hidden size-4 shrink-0 text-gold-600 transition group-hover:translate-x-0.5 sm:block rtl:rotate-180" aria-hidden />}
                </>
              );
              const cls = cn('group flex items-start gap-3 rounded-2xl border p-3 transition-colors', u.pinned ? 'border-gold-300 bg-gold-100/40' : 'border-line/70 bg-cream-50/40', u.link && 'hover:border-gold-400 hover:bg-white');
              return <li key={u.id}>{u.link ? <Link href={u.link} className={cls} aria-label={`${f.L(u)} — ${t('updatesOpen')}`}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
