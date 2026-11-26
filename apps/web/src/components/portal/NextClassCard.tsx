'use client';

import { ArrowRight, CalendarClock, PlayCircle, User, Video } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Empty, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { apiUrl } from '@/lib/client-api';

interface NextClass { id: string; scheduledAt: string; durationMin: number; status: string; course: { code: string; titleEn: string; titleAr: string; imagePath: string | null; teacher: { fullName: string } | null } }

/** The student's next (or current) live class, with a join / opens-at button. */
export function NextClassCard() {
  const t = useTranslations('portal.dash');
  const f = useFmt();
  const { data } = useApi<{ nextClass: NextClass | null }>('/me/portal/dashboard');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  if (!data) return null;
  const next = data.nextClass;
  const startsIn = next ? Math.round((new Date(next.scheduledAt).getTime() - now) / 60_000) : 0;
  return (
  <section className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-cream-50 to-gold-100/60 shadow-[var(--shadow-card)]">
    {next ? (
      <div className="grid gap-0 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="relative hidden aspect-[16/10] md:block md:aspect-auto">
          {next.course.imagePath ? <Image src={apiUrl(next.course.imagePath)} unoptimized={next.course.imagePath.startsWith('/api/')} alt="" fill sizes="320px" className="object-cover" /> : <div className="pattern-girih absolute inset-0 bg-brand-900" />}
          <span className={cn('absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white', next.status === 'LIVE' ? 'bg-danger' : 'bg-brand-900/90')}><Video className="size-3.5" />{next.status === 'LIVE' ? t('live') : t('upcoming')}</span>
          <span className="absolute inset-0 grid place-items-center"><span className="grid size-14 place-items-center rounded-full bg-white/85 text-brand-900 shadow-lg"><PlayCircle className="size-8" /></span></span>
        </div>
        <div className="p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-900"><span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-white md:hidden', next.status === 'LIVE' ? 'bg-danger' : 'bg-brand-900')}><Video className="size-3" />{next.status === 'LIVE' ? t('live') : t('upcoming')}</span>{t('nextClass')}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-brand-900 sm:text-3xl">{f.L(next.course)}</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-ink/80">
            {next.course.teacher && <li className="flex items-center gap-2"><User className="size-4 text-gold-600" />{next.course.teacher.fullName}</li>}
            <li className="flex flex-wrap items-center gap-2"><CalendarClock className="size-4 text-gold-600" />{f.dateTime(next.scheduledAt)}
              {next.status === 'LIVE' ? <span className="inline-flex items-center gap-1 font-semibold text-danger"><span className="size-2 animate-pulse rounded-full bg-danger" />{t('liveNow')}</span>
                : startsIn > 0 && startsIn <= 24 * 60 && <span className="inline-flex items-center gap-1 font-semibold text-success"><span className="size-2 rounded-full bg-success" />{startsIn < 60 ? t('startsInMin', { n: startsIn }) : t('startsInHours', { n: Math.round(startsIn / 60) })}</span>}
            </li>
          </ul>
          {next.status === 'LIVE'
            ? <Link href={`/portal/live/${next.id}`} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-900 font-semibold text-white hover:bg-brand-800">{t('joinClass')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
            : <Link href="/portal/live" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-900/90 font-semibold text-white hover:bg-brand-800">{t('opensAuto', { time: f.time(next.scheduledAt) })}</Link>}
        </div>
      </div>
    ) : <div className="p-6"><Empty text={t('noUpcoming')} /></div>}
  </section>
  );
}
