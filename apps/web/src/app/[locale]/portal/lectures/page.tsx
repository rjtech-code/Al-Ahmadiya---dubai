'use client';

import { CheckCircle2, Clock3, PlayCircle, Search, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AreaTrend, Ring } from '@/components/portal/charts';
import { Card, Empty, ErrorBox, inputCls, Loading, PageTitle, Progress, Segmented, surface, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

interface L { id: string; titleEn: string; titleAr: string; durationSec: number | null; positionSec: number; completed: boolean; watchedAt: string | null; course: { slug: string; code: string; titleEn: string; titleAr: string }; topic: { titleEn: string; titleAr: string } | null }
interface D { lectures: L[]; continueWatching: L[]; upNext: L[] }
interface A { studyWeeks: { label: string; value: number }[] }

const COVER: Record<string, string> = { CS101: 'cs101', BUS101: 'ba101', DS210: 'ds210', AF110: 'af110' };
const pct = (l: L) => (l.completed ? 100 : l.durationSec ? Math.min(100, Math.round((l.positionSec / l.durationSec) * 100)) : 0);

export default function Lectures() {
  const t = useTranslations('portal.lectures');
  const f = useFmt();
  const { data, error } = useApi<D>('/me/portal/lectures');
  const { data: an } = useApi<A>('/me/portal/analytics');
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [show, setShow] = useState<'all' | 'todo' | 'done' | 'recent'>('all');
  const href = (l: L) => `/portal/courses/${l.course.slug}?lesson=${l.id}`;
  const all = data?.lectures ?? [];
  const done = all.filter((l) => l.completed).length;
  const list = all.filter((l) => (!q || `${l.titleEn} ${l.titleAr} ${l.course.code}`.toLowerCase().includes(q.toLowerCase()))
    && (show === 'all' || (show === 'done' ? l.completed : show === 'todo' ? !l.completed : !!l.watchedAt)))
    .sort((a, b) => (show === 'recent' ? +new Date(b.watchedAt ?? 0) - +new Date(a.watchedAt ?? 0) : 0));
  const groups = [...new Set(list.map((l) => l.course.slug))].map((slug) => ({ slug, items: list.filter((l) => l.course.slug === slug) }));
  const resume = data?.continueWatching.filter((l) => !l.completed).slice(0, 3) ?? [];

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
            <section className={cn(surface, 'flex items-center gap-5 p-6')}>
              <Ring value={all.length ? (done / all.length) * 100 : 0} size={112} stroke={10} label={`${done}/${all.length}`} sub={t('watched')} />
              <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{t('studyTime')}</p><p className="mt-1 font-display text-3xl font-semibold text-brand-900">{Math.round((an?.studyWeeks.at(-1)?.value ?? 0) / 60 * 10) / 10} h</p><p className="text-sm text-muted">{t('thisWeek')}</p></div>
            </section>
            <Card icon={TrendingUp} eyebrow={t('last8')} title={t('studyTrend')}>
              {an ? <AreaTrend data={an.studyWeeks} height={130} format={(v) => `${Math.round(v / 60)}h`} label={t('studyTrend')} /> : <Loading />}
            </Card>
          </div>

          {resume.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-2xl font-semibold text-brand-900">{t('continue')}</h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {resume.map((l) => (
                  <li key={l.id}>
                    <Link href={href(l)} className={cn(surface, 'group block overflow-hidden transition hover:-translate-y-0.5')}>
                      <span className="relative block aspect-video overflow-hidden bg-brand-900">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local course covers */}
                        {COVER[l.course.code] && <img src={`/images/courses/${COVER[l.course.code]}.jpg`} alt="" className="size-full object-cover opacity-90 transition group-hover:scale-105" />}
                        <span className="absolute inset-0 grid place-items-center bg-brand-950/30"><span className="grid size-12 place-items-center rounded-full bg-white/90 text-brand-900 shadow-lg"><PlayCircle className="size-7" /></span></span>
                        <span className="absolute inset-x-0 bottom-0 h-1.5 bg-black/30"><span className="block h-full bg-gold-400" style={{ width: `${pct(l)}%` }} /></span>
                      </span>
                      <span className="block p-4"><span className="text-xs font-bold text-gold-700">{l.course.code}</span><span className="block truncate font-semibold text-brand-900">{f.L(l)}</span><span className="text-xs text-muted">{t('resumeAt', { min: Math.floor(l.positionSec / 60) })}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={show} onChange={setShow} options={[{ value: 'all', label: t('all') }, { value: 'todo', label: t('todo') }, { value: 'done', label: t('done') }, { value: 'recent', label: t('recent') }]} />
            <label className="relative"><Search className="absolute start-3.5 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} w-64 ps-10`} /></label>
          </div>
          {groups.length ? groups.map((g) => (
            <Card key={g.slug} eyebrow={g.items[0].course.code} title={f.L(g.items[0].course)}>
              <ul className="divide-y divide-line/70">
                {g.items.map((l) => (
                  <li key={l.id}>
                    <Link href={href(l)} className="flex items-center gap-4 py-3 transition hover:bg-cream-50/70 sm:px-2">
                      {l.completed ? <CheckCircle2 className="size-6 shrink-0 text-success" aria-label={t('watched')} /> : <PlayCircle className="size-6 shrink-0 text-brand-700" />}
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-brand-900">{f.L(l)}</span><span className="text-xs text-muted">{l.topic && f.L(l.topic)}{l.watchedAt && ` · ${f.date(l.watchedAt)}`}</span></span>
                      <span className="hidden w-32 sm:block"><Progress value={pct(l)} tone={l.completed ? 'success' : 'brand'} /></span>
                      {l.durationSec && <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted"><Clock3 className="size-3.5" />{Math.round(l.durationSec / 60)} min</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )) : <Empty text={t('empty')} />}
        </div>
      )}
    </>
  );
}
