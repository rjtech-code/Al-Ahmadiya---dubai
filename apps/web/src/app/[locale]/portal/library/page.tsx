'use client';

import { BookMarked, Database, ExternalLink, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Card, Empty, ErrorBox, inputCls, Loading, PageTitle, Pill, Progress, Segmented, surface, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Item { id: string; type: string; title: string; author: string | null; subject: string | null; year: number | null; url: string | null; available: number | null; copies: number }
interface Loan { id: string; issuedAt?: string; dueAt: string; returnedAt: string | null; renewals: number; item: { title: string; author: string | null } }

const SPINES = ['from-brand-800 to-brand-600', 'from-gold-700 to-gold-500', 'from-[#5b3a29] to-[#8a5a3c]', 'from-[#2f4858] to-[#4a6b7c]', 'from-[#6b2d3a] to-[#94465a]'];
const spine = (s: string) => SPINES[[...s].reduce((h, c) => h + c.charCodeAt(0), 0) % SPINES.length];

export default function StudentLibrary() {
  const t = useTranslations('portal.library');
  const f = useFmt();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'BOOK' | 'digital'>('all');
  const items = useApi<Item[]>(`/me/library/catalogue${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const loans = useApi<Loan[]>('/me/library/loans');
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const rows = (items.data ?? []).filter((i) => type === 'all' || (type === 'BOOK' ? i.type === 'BOOK' : i.type !== 'BOOK'));
  const renew = async (id: string) => { try { await apiFetch(`/me/library/loans/${id}/renew`, { method: 'POST' }); loans.reload(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Error'); } };

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error || items.error || loans.error} />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); setQuery(q.trim()); }} className="relative"><Search className="absolute start-3.5 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} w-72 ps-10`} /></form>
            <Segmented value={type} onChange={setType} options={[{ value: 'all', label: t('all') }, { value: 'BOOK', label: t('books') }, { value: 'digital', label: t('digital') }]} />
          </div>
          {!items.data ? <Loading /> : rows.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rows.map((i) => (
                <li key={i.id} className={cn(surface, 'flex gap-4 p-4')}>
                  <span className={cn('relative grid h-28 w-20 shrink-0 place-items-center overflow-hidden rounded-e-lg rounded-s-sm bg-gradient-to-br text-white shadow-md', i.type === 'BOOK' ? spine(i.title) : 'from-cream-200 to-cream-300 text-brand-900')}>
                    <span className="absolute inset-y-0 start-0 w-2 bg-black/20" />
                    {i.type === 'BOOK' ? <BookMarked className="size-6 opacity-90" /> : <Database className="size-6 text-brand-700" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 font-semibold leading-snug text-brand-900">{i.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{[i.author, i.year].filter(Boolean).join(' · ')}</p>
                    {i.subject && <p className="mt-1 text-[11px] font-semibold text-gold-700">{i.subject}</p>}
                    <div className="mt-auto pt-2">{i.type === 'BOOK' ? (i.available ? <Pill status="PRESENT" label={t('available', { n: i.available })} /> : <Pill status="ABSENT" label={t('none')} />)
                      : i.url && <a href={i.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-full border border-gold-400 px-3 py-1 text-xs font-semibold text-brand-900 hover:bg-cream-100">{t('open')}<ExternalLink className="size-3.5" /></a>}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty text={t('empty')} />}
          <p className="mt-4 text-xs text-muted">{t('borrowHint')}</p>
        </div>
        <Card icon={BookMarked} title={t('myLoans')} className="self-start xl:sticky xl:top-22">
          {!loans.data ? <Loading /> : loans.data.length ? (
            <ul className="space-y-3">
              {loans.data.map((l) => {
                const due = +new Date(l.dueAt), issued = l.issuedAt ? +new Date(l.issuedAt) : due - 14 * 86_400_000;
                const overdue = !l.returnedAt && due < now;
                const left = Math.ceil((due - now) / 86_400_000);
                return (
                  <li key={l.id} className={cn('rounded-2xl border p-3.5 text-sm', overdue ? 'border-danger/30 bg-red-50/60' : 'border-line/70 bg-cream-50/50')}>
                    <p className="font-semibold text-brand-900">{l.item.title}</p>
                    <p className={cn('text-xs', overdue ? 'font-semibold text-danger' : 'text-muted')}>{l.returnedAt ? t('returned', { date: f.date(l.returnedAt) }) : overdue ? t('overdue', { date: f.date(l.dueAt) }) : `${t('due', { date: f.date(l.dueAt) })} · ${t('daysLeft', { n: left })}`}</p>
                    {!l.returnedAt && <Progress value={Math.min(100, ((now - issued) / (due - issued)) * 100)} tone={overdue ? 'warn' : left <= 3 ? 'gold' : 'brand'} className="mt-2" />}
                    {!l.returnedAt && l.renewals < 2 && <button onClick={() => void renew(l.id)} className="mt-3 rounded-full border border-gold-400 bg-white px-3 py-1 text-xs font-semibold text-brand-900 hover:bg-cream-100">{t('renew')}</button>}
                  </li>
                );
              })}
            </ul>
          ) : <Empty text={t('noLoans')} />}
        </Card>
      </div>
    </>
  );
}
