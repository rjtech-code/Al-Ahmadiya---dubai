'use client';

import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

export interface WatchedLecture {
  id: string; titleEn: string; titleAr: string; durationSec: number | null; positionSec?: number; completed?: boolean; watchedAt?: string | null;
  course: { slug: string; code: string; titleEn: string; titleAr: string };
}

const COVERS: Record<string, string> = { CS101: 'cs101', BUS101: 'ba101', DS210: 'ds210', AF110: 'af110' };

/** One lecture at a time with arrows, dots and a gentle auto-advance (paused on hover). */
export function LectureCarousel({ items }: { items: WatchedLecture[] }) {
  const t = useTranslations('portal.dash');
  const f = useFmt();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(id);
  }, [n, paused]);
  const go = (d: number) => setI((x) => (x + d + n) % n);

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
      <div className="overflow-hidden rounded-2xl">
        <ul className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(${f.locale === 'ar' ? i * 100 : -i * 100}%)` }}>
          {items.map((l, k) => {
            const pct = l.completed ? 100 : l.durationSec && l.positionSec ? Math.min(100, Math.round((l.positionSec / l.durationSec) * 100)) : 0;
            const cover = COVERS[l.course.code];
            return (
              <li key={l.id} className="w-full shrink-0" aria-roledescription="slide" aria-label={t('slide', { n: k + 1, total: n })} aria-hidden={k !== i}>
                <Link href={`/portal/courses/${l.course.slug}?lesson=${l.id}`} tabIndex={k === i ? 0 : -1} className="group grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-[minmax(0,16rem)_1fr]">
                  <span className="relative block aspect-video bg-brand-900">
                    {cover && <Image src={`/images/courses/${cover}.jpg`} alt="" fill sizes="(min-width:640px) 256px, 100vw" className="object-cover transition group-hover:scale-105" />}
                    <span className="absolute inset-0 grid place-items-center bg-brand-950/25"><span className="grid size-12 place-items-center rounded-full bg-white/90 text-brand-900 shadow"><PlayCircle className="size-7" /></span></span>
                  </span>
                  <span className="flex flex-col justify-center gap-1 p-4">
                    <span className="text-xs font-semibold text-gold-700">{l.course.code} · {f.L(l.course)}</span>
                    <span className="font-display text-xl font-semibold leading-tight text-brand-900">{f.L(l)}</span>
                    <span className="text-xs text-muted">{l.watchedAt && f.date(l.watchedAt)}{l.durationSec ? ` · ${t('minutes', { n: Math.round(l.durationSec / 60) })}` : ''}</span>
                    <span className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200"><span className="block h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} /></span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {n > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {items.map((l, k) => <button key={l.id} type="button" onClick={() => setI(k)} aria-label={t('slide', { n: k + 1, total: n })} aria-current={k === i} className={cn('h-2 rounded-full transition-all', k === i ? 'w-6 bg-brand-900' : 'w-2 bg-cream-200 hover:bg-gold-300')} />)}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => go(-1)} aria-label={t('previous')} className="grid size-9 place-items-center rounded-full border border-line bg-white text-brand-900 hover:border-gold-400"><ChevronLeft className="size-4 rtl:rotate-180" /></button>
            <button type="button" onClick={() => go(1)} aria-label={t('next')} className="grid size-9 place-items-center rounded-full border border-line bg-white text-brand-900 hover:border-gold-400"><ChevronRight className="size-4 rtl:rotate-180" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
