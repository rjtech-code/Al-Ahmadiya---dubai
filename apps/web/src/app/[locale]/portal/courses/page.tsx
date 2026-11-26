'use client';
/* eslint-disable @next/next/no-img-element -- course covers may be Cloudinary or API URLs */

import { ArrowRight, BookOpen, ClipboardList, Heart, PlayCircle, Radio, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Ring } from '@/components/portal/charts';
import { Empty, ErrorBox, Hero, HeroFigure, inputCls, Loading, PageTitle, Progress, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';
import { apiFetch, formatMoney, apiUrl } from '@/lib/client-api';

interface Course { id: string; slug: string; code: string; titleEn: string; titleAr: string; imagePath: string | null; instructor: string | null; progress: number; lecturesDone: number; lecturesTotal: number; pendingAssignments: number; pendingQuizzes: number; nextClass: { scheduledAt: string; status: string } | null }
interface Wish { id: string; slug: string; code: string; titleEn: string; titleAr: string; imagePath: string | null; priceFils: number | null; currency: string }

const initials = (n: string) => n.replace(/^(Dr|Prof)\.\s*/, '').split(' ').map((x) => x[0]).slice(0, 2).join('');

export default function MyCourses() {
  const t = useTranslations('portal.courses');
  const f = useFmt();
  const [tab, setTab] = useState<'mine' | 'wishlist'>('mine');
  const [q, setQ] = useState('');
  const mine = useApi<Course[]>('/me/portal/courses');
  const wish = useApi<Wish[]>('/me/portal/wishlist');
  const match = (c: { code: string; titleEn: string; titleAr: string }) => !q || `${c.code} ${c.titleEn} ${c.titleAr}`.toLowerCase().includes(q.toLowerCase());
  const cover = (src: string | null, children?: React.ReactNode) => (
    <div className="relative aspect-[16/9] overflow-hidden bg-brand-900">
      {src ? <img src={apiUrl(src)} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="pattern-girih size-full" />}
      <span className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/20 to-transparent" />
      {children}
    </div>
  );
  const list = mine.data ?? [];
  const avg = list.length ? Math.round(list.reduce((s, c) => s + c.progress, 0) / list.length) : 0;

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} actions={<Link href="/courses" className="inline-flex items-center gap-2 rounded-full border border-gold-400 bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm hover:bg-cream-100">{t('browse')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>} />
      {tab === 'mine' && list.length > 0 && (
        <Hero title={t('overallProgress')} subtitle={t('overallHint')} aside={<div className="rounded-full bg-white/95 p-2"><Ring value={avg} size={112} stroke={10} tone="gold" sub={t('complete')} /></div>}>
          <HeroFigure label={t('enrolled')} value={list.length} />
          <HeroFigure label={t('lecturesWatched')} value={`${list.reduce((s, c) => s + c.lecturesDone, 0)}/${list.reduce((s, c) => s + c.lecturesTotal, 0)}`} />
          <HeroFigure label={t('toDo')} value={list.reduce((s, c) => s + c.pendingAssignments + c.pendingQuizzes, 0)} />
        </Hero>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'mine', label: t('mine') }, { value: 'wishlist', label: t('wishlist') }]} />
        <label className="relative"><Search className="absolute start-3.5 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} w-64 ps-10`} /></label>
      </div>
      <ErrorBox message={mine.error || wish.error} />
      {tab === 'mine' && (!mine.data ? <Loading /> : list.filter(match).length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.filter(match).map((c) => (
            <Link key={c.id} href={`/portal/courses/${c.slug}`} className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_10px_30px_-18px_rgb(11_58_60/0.25)] transition hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgb(11_58_60/0.45)]">
              {cover(c.imagePath, (
                <>
                  <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-900">{c.code}</span>
                  {c.nextClass && <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-[11px] font-semibold text-white"><Radio className="size-3" />{c.nextClass.status === 'LIVE' ? t('liveNow') : f.time(c.nextClass.scheduledAt)}</span>}
                  <h2 className="absolute inset-x-4 bottom-3 font-display text-2xl font-semibold leading-tight text-white">{f.L(c)}</h2>
                </>
              ))}
              <div className="flex flex-1 flex-col p-5">
                {c.instructor && <p className="flex items-center gap-2 text-sm text-muted"><span className="grid size-7 place-items-center rounded-full bg-brand-900 text-[10px] font-bold text-gold-300">{initials(c.instructor)}</span>{c.instructor}</p>}
                <div className="mt-4 flex items-center justify-between text-xs"><span className="text-muted">{t('lectures', { done: c.lecturesDone, total: c.lecturesTotal })}</span><strong className="text-brand-900">{c.progress}%</strong></div>
                <Progress value={c.progress} className="mt-1.5" />
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {c.pendingAssignments > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-warning"><ClipboardList className="size-3" />{t('assignmentsDue', { n: c.pendingAssignments })}</span>}
                  {c.pendingQuizzes > 0 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-800">{t('quizzes', { n: c.pendingQuizzes })}</span>}
                </div>
                <span className="mt-auto pt-5"><span className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand-900 text-sm font-semibold text-white transition group-hover:bg-brand-800"><PlayCircle className="size-4" />{t('continue')}</span></span>
              </div>
            </Link>
          ))}
        </div>
      ) : <Empty text={t('empty')}><Link href="/courses" className="font-semibold text-brand-700">{t('browse')}</Link></Empty>)}
      {tab === 'wishlist' && (!wish.data ? <Loading /> : wish.data.filter(match).length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {wish.data.filter(match).map((c) => (
            <article key={c.id} className="group overflow-hidden rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_10px_30px_-18px_rgb(11_58_60/0.25)]">
              {cover(c.imagePath, <h2 className="absolute inset-x-4 bottom-3 font-display text-2xl font-semibold text-white">{f.L(c)}</h2>)}
              <div className="p-5">
                <p className="text-xs font-bold text-gold-700">{c.code}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-brand-900">{c.priceFils ? formatMoney(c.priceFils, c.currency, f.locale) : t('free')}</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/courses/${c.slug}`} className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white"><BookOpen className="size-4" />{t('enrol')}</Link>
                  <button onClick={async () => { await apiFetch(`/me/portal/wishlist/${c.slug}`, { method: 'DELETE' }); wish.reload(); }} className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-2 text-sm font-semibold text-brand-900"><Heart className="size-4 fill-current text-danger" />{t('remove')}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <Empty text={t('wishEmpty')} />)}
    </>
  );
}
