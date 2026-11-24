'use client';

import { BookOpen, ExternalLink, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Card, Empty, ErrorBox, inputCls, Loading, PageTitle, Pill, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Item { id: string; type: string; title: string; author: string | null; subject: string | null; year: number | null; url: string | null; available: number | null; copies: number }
interface Loan { id: string; dueAt: string; returnedAt: string | null; renewals: number; item: { title: string; author: string | null } }

export default function StudentLibrary() {
  const t = useTranslations('portal.library');
  const f = useFmt();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'BOOK' | 'digital'>('all');
  const items = useApi<Item[]>(`/me/library/catalogue${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const loans = useApi<Loan[]>('/me/library/loans');
  const [error, setError] = useState('');
  const rows = (items.data ?? []).filter((i) => type === 'all' || (type === 'BOOK' ? i.type === 'BOOK' : i.type !== 'BOOK'));
  const now = new Date().toISOString();
  const renew = async (id: string) => { try { await apiFetch(`/me/library/loans/${id}/renew`, { method: 'POST' }); loans.reload(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Error'); } };

  return (
    <>
      <PageTitle title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error || items.error || loans.error} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); setQuery(q.trim()); }} className="relative"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} w-72 ps-9`} /></form>
            <Segmented value={type} onChange={setType} options={[{ value: 'all', label: t('all') }, { value: 'BOOK', label: t('books') }, { value: 'digital', label: t('digital') }]} />
          </div>
          {!items.data ? <Loading /> : rows.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((i) => (
                <li key={i.id} className="flex gap-3 rounded-[1.5rem] border border-white/80 bg-cream-50 p-4 shadow-[var(--shadow-card)]">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-100 text-brand-900"><BookOpen className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-900">{i.title}</p>
                    <p className="text-xs text-muted">{[i.author, i.year, i.subject].filter(Boolean).join(' · ')}</p>
                    <div className="mt-2">{i.type === 'BOOK' ? (i.available ? <Pill status="PRESENT" label={t('available', { n: i.available })} /> : <Pill status="ABSENT" label={t('none')} />)
                      : i.url && <a href={i.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">{t('open')}<ExternalLink className="size-3.5" /></a>}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty text={t('empty')} />}
          <p className="mt-3 text-xs text-muted">{t('borrowHint')}</p>
        </div>
        <Card title={t('myLoans')}>
          {!loans.data ? <Loading /> : loans.data.length ? (
            <ul className="space-y-3">
              {loans.data.map((l) => (
                <li key={l.id} className="rounded-2xl bg-white p-3 text-sm">
                  <p className="font-semibold text-brand-900">{l.item.title}</p>
                  <p className={`text-xs ${!l.returnedAt && l.dueAt < now ? 'font-semibold text-danger' : 'text-muted'}`}>{l.returnedAt ? t('returned', { date: f.date(l.returnedAt) }) : l.dueAt < now ? t('overdue', { date: f.date(l.dueAt) }) : t('due', { date: f.date(l.dueAt) })}</p>
                  {!l.returnedAt && l.renewals < 2 && <button onClick={() => void renew(l.id)} className="mt-2 rounded-full border border-gold-400 px-3 py-1 text-xs font-semibold text-brand-900">{t('renew')}</button>}
                </li>
              ))}
            </ul>
          ) : <Empty text={t('noLoans')} />}
        </Card>
      </div>
    </>
  );
}
