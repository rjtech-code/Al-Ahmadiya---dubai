'use client';

import { CheckCircle2, PlayCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Card, Empty, ErrorBox, inputCls, Loading, PageTitle, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';

interface L { id: string; titleEn: string; titleAr: string; durationSec: number | null; positionSec: number; completed: boolean; watchedAt: string | null; course: { slug: string; code: string; titleEn: string; titleAr: string }; topic: { titleEn: string; titleAr: string } | null }
interface D { lectures: L[]; continueWatching: L[]; upNext: L[] }

export default function Lectures() {
  const t = useTranslations('portal.lectures');
  const f = useFmt();
  const { data, error } = useApi<D>('/me/portal/lectures');
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [show, setShow] = useState<'all' | 'todo' | 'done' | 'recent'>('all');
  const href = (l: L) => `/portal/courses/${l.course.slug}?lesson=${l.id}`;
  const row = (l: L) => (
    <li key={l.id}>
      <Link href={href(l)} className="flex items-center gap-3 rounded-2xl bg-white p-3 hover:bg-cream-200">
        {l.completed ? <CheckCircle2 className="size-6 shrink-0 text-success" aria-label={t('watched')} /> : <PlayCircle className="size-6 shrink-0 text-brand-900" />}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-brand-900">{f.L(l)}</span><span className="text-xs text-muted">{l.course.code}{l.topic && ` · ${f.L(l.topic)}`}</span></span>
        {!l.completed && l.positionSec > 0 && <span className="text-xs text-muted">{t('resumeAt', { min: Math.floor(l.positionSec / 60) })}</span>}
      </Link>
    </li>
  );
  const list = (data?.lectures ?? []).filter((l) => (!q || `${l.titleEn} ${l.titleAr} ${l.course.code}`.toLowerCase().includes(q.toLowerCase()))
    && (show === 'all' || (show === 'done' ? l.completed : show === 'todo' ? !l.completed : !!l.watchedAt)))
    .sort((a, b) => (show === 'recent' ? +new Date(b.watchedAt ?? 0) - +new Date(a.watchedAt ?? 0) : 0));
  const groups = [...new Set(list.map((l) => l.course.slug))].map((slug) => ({ slug, items: list.filter((l) => l.course.slug === slug) }));

  return (
    <>
      <PageTitle title={t('title')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={t('continue')}>{data.continueWatching.length ? <ul className="space-y-2">{data.continueWatching.map(row)}</ul> : <Empty text={t('nothingStarted')} />}</Card>
            <Card title={t('upNext')}>{data.upNext.length ? <ul className="space-y-2">{data.upNext.map(row)}</ul> : <Empty text={t('allDone')} />}</Card>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={show} onChange={setShow} options={[{ value: 'all', label: t('all') }, { value: 'todo', label: t('todo') }, { value: 'done', label: t('done') }, { value: 'recent', label: t('recent') }]} />
            <label className="relative"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} ps-9`} /></label>
          </div>
          {groups.length ? groups.map((g) => <Card key={g.slug} title={f.L(g.items[0].course)}><ul className="space-y-2">{g.items.map(row)}</ul></Card>) : <Empty text={t('empty')} />}
        </div>
      )}
    </>
  );
}
