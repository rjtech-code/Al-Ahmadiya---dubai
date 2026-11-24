'use client';

import { BookOpen, Heart, Radio, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Empty, ErrorBox, inputCls, Loading, PageTitle, Progress, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';
import { apiFetch, formatMoney } from '@/lib/client-api';

interface Course { id: string; slug: string; code: string; titleEn: string; titleAr: string; imagePath: string | null; instructor: string | null; progress: number; lecturesDone: number; lecturesTotal: number; pendingAssignments: number; pendingQuizzes: number; nextClass: { scheduledAt: string; status: string } | null }
interface Wish { id: string; slug: string; code: string; titleEn: string; titleAr: string; imagePath: string | null; priceFils: number | null; currency: string }

export default function MyCourses() {
  const t = useTranslations('portal.courses');
  const f = useFmt();
  const [tab, setTab] = useState<'mine' | 'wishlist'>('mine');
  const [q, setQ] = useState('');
  const mine = useApi<Course[]>('/me/portal/courses');
  const wish = useApi<Wish[]>('/me/portal/wishlist');
  const match = (c: { code: string; titleEn: string; titleAr: string }) => !q || `${c.code} ${c.titleEn} ${c.titleAr}`.toLowerCase().includes(q.toLowerCase());
  const img = (src: string | null) => (src ? <img src={src} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="pattern-girih aspect-[16/9] bg-brand-900" />);

  return (
    <>
      <PageTitle title={t('title')} actions={<Link href="/courses" className="rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-cream-200">{t('browse')}</Link>} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'mine', label: t('mine') }, { value: 'wishlist', label: t('wishlist') }]} />
        <label className="relative"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} ps-9`} /></label>
      </div>
      <ErrorBox message={mine.error || wish.error} />
      {tab === 'mine' && (!mine.data ? <Loading /> : mine.data.filter(match).length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {mine.data.filter(match).map((c) => (
            <Link key={c.id} href={`/portal/courses/${c.slug}`} className="group overflow-hidden rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
              {img(c.imagePath)}
              <div className="p-5">
                <p className="text-xs font-semibold text-gold-700">{c.code}{c.instructor && ` · ${c.instructor}`}</p>
                <h2 className="mt-0.5 font-display text-xl font-semibold text-brand-900">{f.L(c)}</h2>
                <Progress value={c.progress} className="mt-4" />
                <p className="mt-1 flex justify-between text-xs text-muted"><span>{t('lectures', { done: c.lecturesDone, total: c.lecturesTotal })}</span><strong className="text-brand-900">{c.progress}%</strong></p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {c.pendingAssignments > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-warning">{t('assignmentsDue', { n: c.pendingAssignments })}</span>}
                  {c.pendingQuizzes > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800">{t('quizzes', { n: c.pendingQuizzes })}</span>}
                  {c.nextClass && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-danger"><Radio className="size-3" />{c.nextClass.status === 'LIVE' ? t('liveNow') : f.dateTime(c.nextClass.scheduledAt)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : <Empty text={t('empty')}><Link href="/courses" className="font-semibold text-brand-700">{t('browse')}</Link></Empty>)}
      {tab === 'wishlist' && (!wish.data ? <Loading /> : wish.data.filter(match).length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {wish.data.filter(match).map((c) => (
            <article key={c.id} className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
              {img(c.imagePath)}
              <div className="p-5">
                <p className="text-xs font-semibold text-gold-700">{c.code}</p>
                <h2 className="font-display text-xl font-semibold text-brand-900">{f.L(c)}</h2>
                <p className="mt-1 text-sm text-muted">{c.priceFils ? formatMoney(c.priceFils, c.currency, f.locale) : t('free')}</p>
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
